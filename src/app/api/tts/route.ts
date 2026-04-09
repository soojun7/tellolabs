import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { requireAuth, useCredits } from "@/lib/apiAuth";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "4JJwo477JUAx3HV0T7n7";

function estimateMp3Duration(buf: Buffer): number {
  const bitrate = 128_000;
  const sizeInBits = buf.length * 8;
  return Math.round((sizeInBits / bitrate) * 10) / 10;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "tts");
  if (creditResult instanceof NextResponse) return creditResult;

  try {
    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });
    }

    const vid = voiceId || DEFAULT_VOICE_ID;

    const MAX_RETRIES = 3;
    let lastRes: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      lastRes = await fetch(
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

      if (lastRes.ok) break;
      if (lastRes.status === 429 && attempt < MAX_RETRIES) {
        const delay = 1000 * (attempt + 1);
        console.warn(`ElevenLabs 429 — retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      break;
    }

    const res = lastRes!;
    if (!res.ok) {
      const errText = await res.text();
      console.error("ElevenLabs error:", res.status, errText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${res.status}` },
        { status: 502 },
      );
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    const filename = `tts-${randomUUID()}.mp3`;
    const duration = estimateMp3Duration(audioBuffer);

    let audioUrl: string;
    if (isR2Configured()) {
      audioUrl = await uploadToR2(`audio/${filename}`, audioBuffer);
    } else {
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const localDir = join(process.cwd(), "public", "audio");
      await mkdir(localDir, { recursive: true });
      await writeFile(join(localDir, filename), audioBuffer);
      audioUrl = `/audio/${filename}`;
    }

    return NextResponse.json({ audioUrl, duration, filename });
  } catch (err: unknown) {
    console.error("TTS error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "TTS generation failed" },
      { status: 500 },
    );
  }
}
