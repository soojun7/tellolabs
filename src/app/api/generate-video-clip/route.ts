import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { uploadFileToR2, isR2Configured } from "@/lib/r2";

const execFileAsync = promisify(execFile);

const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const VIDEO_MODEL = "minimax/hailuo-02/fast";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 300_000;
const ALLOWED_DURATIONS = [6, 10];
const TARGET_FPS = 30;

function snapDuration(seconds: number): number {
  return ALLOWED_DURATIONS.reduce((best, v) =>
    Math.abs(v - seconds) < Math.abs(best - seconds) ? v : best,
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.WAVESPEED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "WAVESPEED_API_KEY not set" }, { status: 500 });
  }

  const { imageUrl, prompt, durationSeconds } = (await req.json()) as {
    imageUrl: string;
    prompt?: string;
    durationSeconds?: number;
  };

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const snappedDur = snapDuration(durationSeconds ?? 6);

  try {
    const createResp = await fetch(`${WAVESPEED_BASE}/${VIDEO_MODEL}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        image: imageUrl,
        prompt: (prompt || "cinematic slow motion, high quality").slice(0, 500),
        duration: snappedDur,
        enable_prompt_expansion: true,
        go_fast: true,
      }),
    });

    if (!createResp.ok) {
      const errText = await createResp.text();
      console.error("WaveSpeed create error:", createResp.status, errText);
      return NextResponse.json({ error: `WaveSpeed API error: ${createResp.status}` }, { status: 502 });
    }

    const outer = await createResp.json();
    if (outer.code !== 200) {
      return NextResponse.json({ error: outer.message || "WaveSpeed error" }, { status: 502 });
    }

    const predictionId = outer.data.id;
    const pollUrl = outer.data.urls.get;

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let videoUrl = "";

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const pollResp = await fetch(pollUrl, { headers });
      if (!pollResp.ok) continue;

      const pollOuter = await pollResp.json();
      const result = pollOuter.data || {};
      const status = result.status || "";

      if (status === "completed") {
        const outputs = result.outputs || [];
        if (outputs.length > 0) {
          videoUrl = outputs[0];
        }
        break;
      } else if (status === "failed" || status === "error") {
        return NextResponse.json(
          { error: `WaveSpeed failed: ${result.error || "unknown"}` },
          { status: 502 },
        );
      }
    }

    if (!videoUrl) {
      return NextResponse.json({ error: "WaveSpeed timeout" }, { status: 504 });
    }

    const videoResp = await fetch(videoUrl);
    if (!videoResp.ok) {
      return NextResponse.json({ error: "Failed to download video" }, { status: 502 });
    }
    const videoBuf = Buffer.from(await videoResp.arrayBuffer());

    const tmpDir = path.join(os.tmpdir(), "tello-video");
    await mkdir(tmpDir, { recursive: true });

    const rawFilename = `clip-raw-${randomUUID()}.mp4`;
    const rawPath = path.join(tmpDir, rawFilename);
    await writeFile(rawPath, videoBuf);

    const filename = `clip-${randomUUID()}.mp4`;
    const filePath = path.join(tmpDir, filename);

    try {
      await execFileAsync("ffmpeg", [
        "-y", "-i", rawPath,
        "-vf", `fps=${TARGET_FPS},scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080`,
        "-vsync", "cfr",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        filePath,
      ], { timeout: 120000 });
      try { await unlink(rawPath); } catch { /* ignore */ }
    } catch (err) {
      console.error("FFmpeg re-encode failed, using original:", err);
      const { rename } = await import("fs/promises");
      await rename(rawPath, filePath);
    }

    let videoUrl: string;
    if (isR2Configured()) {
      videoUrl = await uploadFileToR2(`videos/${filename}`, filePath);
      try { await unlink(filePath); } catch { /* ignore */ }
    } else {
      const localDir = path.join(process.cwd(), "public", "videos");
      await mkdir(localDir, { recursive: true });
      const { rename } = await import("fs/promises");
      await rename(filePath, path.join(localDir, filename));
      videoUrl = `/videos/${filename}`;
    }

    return NextResponse.json({ videoUrl, duration: snappedDur, predictionId });
  } catch (err: unknown) {
    console.error("WaveSpeed error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
