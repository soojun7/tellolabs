import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { readFile } from "fs/promises";
import { Readable } from "stream";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const BUCKET = process.env.R2_BUCKET_NAME || "tellolabs";
const PUBLIC_URL = process.env.R2_PUBLIC_URL!; // e.g. https://pub-xxx.r2.dev

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function guessMime(key: string): string {
  const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
): Promise<string> {
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

export async function uploadFileToR2(
  key: string,
  localPath: string,
): Promise<string> {
  const buf = await readFile(localPath);
  return uploadToR2(key, buf);
}

export async function deleteFromR2(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}

export function r2Url(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

export async function streamUploadToR2(
  key: string,
  stream: ReadableStream | Readable,
  contentLength?: number,
): Promise<string> {
  const nodeStream = stream instanceof Readable
    ? stream
    : Readable.fromWeb(stream as import("stream/web").ReadableStream);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: nodeStream,
      ContentType: guessMime(key),
      ...(contentLength ? { ContentLength: contentLength } : {}),
    },
    queueSize: 1,
    partSize: 5 * 1024 * 1024,
  });

  await upload.done();
  return `${PUBLIC_URL}/${key}`;
}

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_PUBLIC_URL
  );
}
