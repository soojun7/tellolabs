import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile, unlink, stat } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "4JJwo477JUAx3HV0T7n7";

async function trimAndSqueeze(inputPath: string): Promise<void> {
  const tmpPath = inputPath.replace(".mp3", "_trimmed.mp3");
  try {
    await execFileAsync("ffmpeg", [
      "-y", "-i", inputPath,
      "-af", [
        "silenceremove=stop_periods=-1:stop_threshold=-50dB:stop_duration=0.4:stop_silence=0.25",
        "areverse",
        "silenceremove=start_periods=1:start_threshold=-35dB:start_duration=0.05",
        "afade=t=in:d=0.06",
        "areverse",
        "apad=pad_dur=0.02",
      ].join(","),
      "-b:a", "128k",
      tmpPath,
    ], { timeout: 15000 });

    const trimmedStat = await stat(tmpPath);
    if (trimmedStat.size > 1000) {
      const trimmedBuf = await readFile(tmpPath);
      await writeFile(inputPath, trimmedBuf);
    }
  } catch (err) {
    console.error("Trim/squeeze failed (using original):", err);
  } finally {
    try { await unlink(tmpPath); } catch { /* ignore */ }
  }
}

async function getActualDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ], { timeout: 5000 });
    const dur = parseFloat(stdout.trim());
    return isNaN(dur) ? estimateMp3Duration(filePath) : Math.round(dur * 10) / 10;
  } catch {
    return estimateMp3Duration(filePath);
  }
}

async function estimateMp3Duration(filePath: string): Promise<number> {
  const buf = await readFile(filePath);
  const bitrate = 128_000;
  const sizeInBits = buf.length * 8;
  return Math.round((sizeInBits / bitrate) * 10) / 10;
}

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });
    }

    const vid = voiceId || DEFAULT_VOICE_ID;

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_v3",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("ElevenLabs error:", res.status, errText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${res.status}` },
        { status: 502 },
      );
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());

    const audioDir = path.join(process.cwd(), "public", "audio");
    await mkdir(audioDir, { recursive: true });

    const filename = `tts-${randomUUID()}.mp3`;
    const filePath = path.join(audioDir, filename);
    await writeFile(filePath, audioBuffer);

    await trimAndSqueeze(filePath);

    const duration = await getActualDuration(filePath);

    return NextResponse.json({
      audioUrl: `/audio/${filename}`,
      duration,
      filename,
    });
  } catch (err: unknown) {
    console.error("TTS error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "TTS generation failed" },
      { status: 500 },
    );
  }
}
