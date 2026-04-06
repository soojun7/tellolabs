import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString());

  const { scenes: rawScenes, fps = 30, sceneDurationFrames = 120, outputFileName } = input;

  const scenes = rawScenes;

  const entryPoint = path.join(ROOT, "src", "remotion", "index.ts");
  const outputDir = path.join(ROOT, "public", "renders");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outFile = outputFileName || `render-${Date.now()}.mp4`;
  const outputLocation = path.join(outputDir, outFile);

  console.error(`[render] Bundling...`);

  const publicDir = path.join(ROOT, "public");

  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => ({
      ...config,
      cache: { type: "filesystem" },
    }),
    publicDir,
  });

  console.error(`[render] Bundle ready: ${bundleLocation}`);

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

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps,
    concurrency: 1,
    imageFormat: "jpeg",
    jpegQuality: 80,
    chromiumOptions: {
      gl: "angle",
      disableWebSecurity: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-translate",
        "--no-first-run",
        "--js-flags=--max-old-space-size=256",
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
  process.stdout.write(JSON.stringify({ error: err.message, done: true }) + "\n");
  process.exit(1);
});
