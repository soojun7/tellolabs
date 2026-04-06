import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, stat } from "fs/promises";
import path from "path";

const VOICEVOX_URL = process.env.VOICEVOX_URL ?? "http://localhost:50021";

export async function GET(req: NextRequest) {
  const speakerId = req.nextUrl.searchParams.get("id");
  if (!speakerId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const cacheDir = path.join(process.cwd(), "public", "audio", "previews");
  await mkdir(cacheDir, { recursive: true });
  const cacheFile = path.join(cacheDir, `vv-preview-${speakerId}.wav`);

  try {
    const cached = await stat(cacheFile).catch(() => null);
    if (cached && cached.size > 500) {
      return NextResponse.json({ previewUrl: `/audio/previews/vv-preview-${speakerId}.wav` });
    }
  } catch { /* generate fresh */ }

  try {
    const sampleText = "こんにちは、私の声はこんな感じです。よろしくお願いします。";

    const queryRes = await fetch(
      `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(sampleText)}&speaker=${speakerId}`,
      { method: "POST" },
    );
    if (!queryRes.ok) {
      return NextResponse.json({ error: "audio_query failed" }, { status: 502 });
    }
    const audioQuery = await queryRes.json();

    const synthRes = await fetch(
      `${VOICEVOX_URL}/synthesis?speaker=${speakerId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(audioQuery),
      },
    );
    if (!synthRes.ok) {
      return NextResponse.json({ error: "synthesis failed" }, { status: 502 });
    }

    const buf = Buffer.from(await synthRes.arrayBuffer());
    await writeFile(cacheFile, buf);

    return NextResponse.json({ previewUrl: `/audio/previews/vv-preview-${speakerId}.wav` });
  } catch (err: unknown) {
    console.error("VOICEVOX preview error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
