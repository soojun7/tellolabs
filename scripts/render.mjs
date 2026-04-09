import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const totalMemGB = os.totalmem() / 1024 / 1024 / 1024;
const cpuCount = os.cpus().length;
const isLocalMachine = totalMemGB > 4;

function cleanOldTempDirs() {
  const tmpDir = os.tmpdir();
  try {
    const entries = fs.readdirSync(tmpDir);
    const prefixes = ["remotion-webpack-bundle-", "remotion-v", "react-motion-render"];
    let cleaned = 0;
    for (const entry of entries) {
      if (!prefixes.some((p) => entry.startsWith(p))) continue;
      const fullPath = path.join(tmpDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs > 30 * 60 * 1000) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          cleaned++;
        }
      } catch { /* skip locked dirs */ }
    }
    if (cleaned > 0) console.error(`[render] Cleaned ${cleaned} old temp dirs`);
  } catch { /* ignore */ }
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString());

  const { scenes: rawScenes, fps = 30, sceneDurationFrames = 120, outputFileName } = input;

  const scenes = rawScenes;

  const outputDir = path.join(ROOT, "public", "renders");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outFile = outputFileName || `render-${Date.now()}.mp4`;
  const outputLocation = path.join(outputDir, outFile);

  cleanOldTempDirs();

  const preBundlePath = path.join(ROOT, ".remotion-bundle");
  let bundleLocation;

  if (fs.existsSync(preBundlePath) && fs.existsSync(path.join(preBundlePath, "index.html"))) {
    console.error(`[render] Using pre-built bundle: ${preBundlePath}`);
    bundleLocation = preBundlePath;
  } else {
    console.error(`[render] Bundling...`);
    const entryPoint = path.join(ROOT, "src", "remotion", "index.ts");
    const publicDir = path.join(ROOT, "public");

    const { bundle } = await import("@remotion/bundler");
    bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => ({
        ...config,
        cache: { type: "filesystem" },
      }),
      publicDir,
    });
    console.error(`[render] Bundle ready: ${bundleLocation}`);
  }

  const dirsToLink = ["audio", "uploads", "renders", "videos"];
  for (const dir of dirsToLink) {
    const src = path.join(ROOT, "public", dir);
    const dest = path.join(bundleLocation, dir);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      try {
        fs.symlinkSync(src, dest, "dir");
        console.error(`[render] Symlinked ${dir}/`);
      } catch (e) {
        try {
          fs.cpSync(src, dest, { recursive: true });
          console.error(`[render] Copied ${dir}/`);
        } catch (e2) {
          console.error(`[render] Warning: could not link/copy ${dir}: ${e2.message}`);
        }
      }
    }
  }

  const inputProps = { scenes, fps, sceneDurationFrames };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "MotionVideo",
    inputProps,
  });

  console.error(
    `[render] Rendering ${composition.durationInFrames} frames at ${composition.fps}fps...`,
  );

  let lastProgress = 0;

  const renderConcurrency = isLocalMachine
    ? Math.max(2, Math.min(cpuCount - 2, 6))
    : 1;
  const chromiumHeapMB = isLocalMachine ? 512 : 256;

  console.error(
    `[render] Environment: ${totalMemGB.toFixed(1)}GB RAM, ${cpuCount} CPUs → concurrency=${renderConcurrency}`,
  );

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps,
    concurrency: renderConcurrency,
    imageFormat: "jpeg",
    jpegQuality: 80,
    chromiumOptions: {
      gl: "angle",
      disableWebSecurity: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        ...(isLocalMachine ? [] : ["--disable-gpu"]),
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-translate",
        "--no-first-run",
        `--js-flags=--max-old-space-size=${chromiumHeapMB}`,
      ],
    },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct > lastProgress) {
        lastProgress = pct;
        console.error(`[render] Progress: ${pct}%`);
        process.stdout.write(JSON.stringify({ progress, done: false }) + "\n");
      }
    },
  });

  console.error(`[render] Done! ${outputLocation}`);

  if (bundleLocation !== preBundlePath) {
    try {
      fs.rmSync(bundleLocation, { recursive: true, force: true });
      console.error(`[render] Cleaned bundle dir`);
    } catch { /* ignore */ }
  }

  process.stdout.write(
    JSON.stringify({
      progress: 1,
      done: true,
      url: `/renders/${outFile}`,
    }) + "\n",
  );
}

main().catch((err) => {
  console.error(`[render] FATAL: ${err.message}`);
  cleanOldTempDirs();
  process.stdout.write(JSON.stringify({ error: err.message, done: true }) + "\n");
  process.exit(1);
});
