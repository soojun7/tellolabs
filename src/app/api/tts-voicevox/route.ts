import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile, unlink, stat } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { uploadFileToR2, isR2Configured } from "@/lib/r2";

const execFileAsync = promisify(execFile);

const VOICEVOX_URL = process.env.VOICEVOX_URL ?? "http://localhost:50021";

async function trimAndSqueeze(inputPath: string): Promise<void> {
  const tmpPath = inputPath.replace(".wav", "_trimmed.wav");
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

async function wavToMp3(wavPath: string, mp3Path: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y", "-i", wavPath,
    "-b:a", "128k",
    mp3Path,
  ], { timeout: 15000 });
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
    return isNaN(dur) ? 2 : Math.round(dur * 10) / 10;
  } catch {
    return 2;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text, speakerId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const speaker = speakerId ?? 3;

    const cleanText = text.replace(/\n+/g, "、").replace(/\s{2,}/g, "、").trim();

    const queryRes = await fetch(
      `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(cleanText)}&speaker=${speaker}`,
      { method: "POST" },
    );

    if (!queryRes.ok) {
      const err = await queryRes.text();
      console.error("VOICEVOX audio_query error:", queryRes.status, err);
      return NextResponse.json(
        { error: `VOICEVOX audio_query failed: ${queryRes.status}` },
        { status: 502 },
      );
    }

    const audioQuery = await queryRes.json();

    audioQuery.speedScale = audioQuery.speedScale ?? 1.0;
    audioQuery.pitchScale = audioQuery.pitchScale ?? 0.0;
    audioQuery.volumeScale = audioQuery.volumeScale ?? 1.0;
    audioQuery.prePhonemeLength = 0.1;
    audioQuery.postPhonemeLength = 0.1;

    if (audioQuery.accent_phrases) {
      for (const phrase of audioQuery.accent_phrases) {
        if (phrase.pause_mora) {
          phrase.pause_mora.vowel_length = Math.min(phrase.pause_mora.vowel_length, 0.3);
        }
      }
    }

    const synthRes = await fetch(
      `${VOICEVOX_URL}/synthesis?speaker=${speaker}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(audioQuery),
      },
    );

    if (!synthRes.ok) {
      const err = await synthRes.text();
      console.error("VOICEVOX synthesis error:", synthRes.status, err);
      return NextResponse.json(
        { error: `VOICEVOX synthesis failed: ${synthRes.status}` },
        { status: 502 },
      );
    }

    const audioBuffer = Buffer.from(await synthRes.arrayBuffer());

    const tmpDir = path.join(os.tmpdir(), "tello-audio");
    await mkdir(tmpDir, { recursive: true });

    const id = randomUUID();
    const wavPath = path.join(tmpDir, `tts-${id}.wav`);
    const mp3Filename = `tts-${id}.mp3`;
    const mp3Path = path.join(tmpDir, mp3Filename);

    await writeFile(wavPath, audioBuffer);
    await trimAndSqueeze(wavPath);
    await wavToMp3(wavPath, mp3Path);

    try { await unlink(wavPath); } catch { /* ignore */ }

    const duration = await getActualDuration(mp3Path);

    let audioUrl: string;
    if (isR2Configured()) {
      audioUrl = await uploadFileToR2(`audio/${mp3Filename}`, mp3Path);
      try { await unlink(mp3Path); } catch { /* ignore */ }
    } else {
      const localDir = path.join(process.cwd(), "public", "audio");
      await mkdir(localDir, { recursive: true });
      const buf = await readFile(mp3Path);
      await writeFile(path.join(localDir, mp3Filename), buf);
      try { await unlink(mp3Path); } catch { /* ignore */ }
      audioUrl = `/audio/${mp3Filename}`;
    }

    return NextResponse.json({ audioUrl, duration, filename: mp3Filename });
  } catch (err: unknown) {
    console.error("VOICEVOX TTS error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "VOICEVOX TTS failed" },
      { status: 500 },
    );
  }
}
