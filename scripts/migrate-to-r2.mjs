import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnv() {
  const content = readFileSync(path.join(ROOT, ".env.local"), "utf-8");
  for (const line of content.split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const BUCKET = process.env.R2_BUCKET_NAME || "tellolabs";
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const MIME = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function guessMime(f) {
  const ext = path.extname(f).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

async function uploadFile(localPath, key) {
  const body = readFileSync(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: guessMime(key),
    }),
  );
  return `${PUBLIC_URL}/${key}`;
}

async function migrateDir(subdir) {
  const dirPath = path.join(ROOT, "public", subdir);
  let files;
  try {
    files = readdirSync(dirPath).filter((f) => !f.startsWith("."));
  } catch {
    console.log(`  [skip] ${subdir}/ not found`);
    return 0;
  }

  let count = 0;
  const total = files.length;

  for (const file of files) {
    const localPath = path.join(dirPath, file);
    const st = statSync(localPath);
    if (!st.isFile()) continue;

    const key = `${subdir}/${file}`;
    try {
      await uploadFile(localPath, key);
      count++;
      if (count % 50 === 0 || count === total) {
        console.log(`  [${subdir}] ${count}/${total} uploaded`);
      }
    } catch (err) {
      console.error(`  [ERROR] ${key}: ${err.message}`);
    }
  }

  return count;
}

async function main() {
  console.log("=== Migrating local media to Cloudflare R2 ===\n");
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Public URL: ${PUBLIC_URL}\n`);

  let total = 0;

  console.log("1. Uploading audio/...");
  total += await migrateDir("audio");

  console.log("2. Uploading videos/...");
  total += await migrateDir("videos");

  console.log("3. Uploading uploads/...");
  total += await migrateDir("uploads");

  console.log(`\n=== Done! ${total} files uploaded to R2 ===`);
  console.log(`\nURL mapping: /audio/xxx.mp3 → ${PUBLIC_URL}/audio/xxx.mp3`);
  console.log(`URL mapping: /videos/xxx.mp4 → ${PUBLIC_URL}/videos/xxx.mp4`);
  console.log(`URL mapping: /uploads/xxx.png → ${PUBLIC_URL}/uploads/xxx.png`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
