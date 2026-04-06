import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { mkdir } from "fs/promises";
import { uploadFileToR2, isR2Configured } from "@/lib/r2";

const ROOT = path.resolve(process.cwd());

const jobs = new Map<
  string,
  { progress: number; done: boolean; url?: string; error?: string }
>();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  jobs.set(jobId, { progress: 0, done: false });

  const renderDir = path.join(ROOT, "public", "renders");
  await mkdir(renderDir, { recursive: true });

  const scriptPath = path.resolve(ROOT, "scripts", "render.mjs");

  const child = spawn(process.execPath, [scriptPath], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  child.stdin.write(JSON.stringify(body));
  child.stdin.end();

  let buffer = "";

  child.stdout.on("data", (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        const job = jobs.get(jobId);
        if (job) {
          job.progress = msg.progress ?? job.progress;
          if (msg.done) {
            job.done = true;
            job.url = msg.url;
            job.error = msg.error;
          }
        }
      } catch {
        /* non-json line */
      }
    }
  });

  child.stderr.on("data", (data: Buffer) => {
    console.error(`[render:${jobId}]`, data.toString());
  });

  child.on("close", async (code) => {
    const job = jobs.get(jobId);
    if (buffer.trim()) {
      try {
        const msg = JSON.parse(buffer.trim());
        if (job) {
          job.progress = msg.progress ?? job.progress;
          if (msg.done) {
            job.done = true;
            job.url = msg.url;
            job.error = msg.error;
          }
        }
      } catch { /* ignore */ }
      buffer = "";
    }
    if (job && !job.done) {
      job.done = true;
      if (code !== 0) {
        job.error = `Process exited with code ${code}`;
      }
    }

    if (job?.url && !job.error && isR2Configured()) {
      try {
        const localFile = path.join(ROOT, "public", job.url);
        const key = job.url.startsWith("/") ? job.url.slice(1) : job.url;
        const r2Url = await uploadFileToR2(key, localFile);
        job.url = r2Url;
        const { unlink } = await import("fs/promises");
        try { await unlink(localFile); } catch { /* ignore */ }
      } catch (err) {
        console.error(`[render:${jobId}] R2 upload failed:`, err);
      }
    }

    setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
  });

  return NextResponse.json({ jobId });
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!jobId || !jobs.has(jobId)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(jobs.get(jobId));
}
