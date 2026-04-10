import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { uploadToR2, streamUploadToR2, isR2Configured } from "@/lib/r2";
import { requireAuth, useCredits } from "@/lib/apiAuth";
import { fetchWithRetry } from "@/lib/fetchRetry";

export const dynamic = "force-dynamic";

const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const VIDEO_MODEL = "minimax/hailuo-02/fast";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 300_000;
const ALLOWED_DURATIONS = [6, 10];

function snapDuration(seconds: number): number {
  return ALLOWED_DURATIONS.reduce((best, v) =>
    Math.abs(v - seconds) < Math.abs(best - seconds) ? v : best,
  );
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "generate-video-clip");
  if (creditResult instanceof NextResponse) return creditResult;

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
    const createResp = await fetchWithRetry(`${WAVESPEED_BASE}/${VIDEO_MODEL}`, {
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
    const filename = `clip-${randomUUID()}.mp4`;
    const contentLength = parseInt(videoResp.headers.get("content-length") || "0", 10) || undefined;

    let resultUrl: string;
    if (isR2Configured() && videoResp.body) {
      resultUrl = await streamUploadToR2(`videos/${filename}`, videoResp.body, contentLength);
    } else if (isR2Configured()) {
      const videoBuf = Buffer.from(await videoResp.arrayBuffer());
      resultUrl = await uploadToR2(`videos/${filename}`, videoBuf);
    } else {
      const videoBuf = Buffer.from(await videoResp.arrayBuffer());
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const localDir = join(process.cwd(), "public", "videos");
      await mkdir(localDir, { recursive: true });
      await writeFile(join(localDir, filename), videoBuf);
      resultUrl = `/videos/${filename}`;
    }

    return NextResponse.json({ videoUrl: resultUrl, duration: snappedDur, predictionId });
  } catch (err: unknown) {
    console.error("WaveSpeed error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
