import { NextRequest, NextResponse } from "next/server";
import {
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda/client";
import { requireAuth, useCredits } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const REGION = (process.env.REMOTION_AWS_REGION || "ap-northeast-2") as
  | "ap-northeast-2"
  | "us-east-1"
  | "us-east-2"
  | "us-west-2"
  | "eu-central-1"
  | "eu-west-1"
  | "eu-west-2"
  | "ap-south-1"
  | "ap-southeast-1"
  | "ap-southeast-2"
  | "ap-northeast-1";

const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME!;
const SERVE_URL = process.env.REMOTION_SERVE_URL!;

const jobs = new Map<
  string,
  {
    progress: number;
    done: boolean;
    url?: string;
    error?: string;
    renderId?: string;
    bucketName?: string;
  }
>();

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "render");
  if (creditResult instanceof NextResponse) return creditResult;

  const body = await req.json();
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  jobs.set(jobId, { progress: 0, done: false });

  (async () => {
    try {
      const { scenes, fps = 30, sceneDurationFrames = 120 } = body;

      console.log(`[render:${jobId}] Starting Lambda render, ${scenes?.length || 0} scenes`);

      let renderId: string | undefined;
      let bucketName: string | undefined;
      const MAX_ATTEMPTS = 3;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const result = await renderMediaOnLambda({
            region: REGION,
            functionName: FUNCTION_NAME,
            serveUrl: SERVE_URL,
            composition: "MotionVideo",
            inputProps: { scenes, fps, sceneDurationFrames },
            codec: "h264",
            imageFormat: "jpeg",
            jpegQuality: 80,
            framesPerLambda: 800,
            privacy: "public",
            maxRetries: 1,
          });
          renderId = result.renderId;
          bucketName = result.bucketName;
          break;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const isRateLimit = msg.includes("Rate Exceeded") || msg.includes("Concurrency");
          if (isRateLimit && attempt < MAX_ATTEMPTS) {
            const wait = attempt * 15_000;
            console.warn(`[render:${jobId}] Rate limit hit, retry ${attempt}/${MAX_ATTEMPTS} in ${wait / 1000}s`);
            await new Promise((r) => setTimeout(r, wait));
          } else {
            throw err;
          }
        }
      }

      if (!renderId || !bucketName) throw new Error("Failed to start render");

      console.log(`[render:${jobId}] renderId=${renderId}, bucket=${bucketName}`);

      const job = jobs.get(jobId);
      if (job) {
        job.renderId = renderId;
        job.bucketName = bucketName;
      }

      let done = false;
      while (!done) {
        await new Promise((r) => setTimeout(r, 2000));

        const progress = await getRenderProgress({
          renderId,
          bucketName,
          functionName: FUNCTION_NAME,
          region: REGION,
        });

        const currentJob = jobs.get(jobId);
        if (!currentJob) break;

        if (progress.fatalErrorEncountered) {
          currentJob.done = true;
          currentJob.error =
            progress.errors?.[0]?.message || "Lambda render failed";
          done = true;
          console.error(`[render:${jobId}] FATAL:`, currentJob.error);
          break;
        }

        currentJob.progress = progress.overallProgress;

        if (progress.done && progress.outputFile) {
          currentJob.done = true;
          currentJob.progress = 1;
          currentJob.url = progress.outputFile;
          done = true;
          console.log(`[render:${jobId}] Done! ${progress.outputFile}`);
        }
      }
    } catch (err) {
      console.error(`[render:${jobId}] ERROR:`, err);
      const job = jobs.get(jobId);
      if (job) {
        job.done = true;
        job.error = err instanceof Error ? err.message : String(err);
      }
    } finally {
      setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
    }
  })();

  return NextResponse.json({ jobId });
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!jobId || !jobs.has(jobId)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(jobs.get(jobId));
}
