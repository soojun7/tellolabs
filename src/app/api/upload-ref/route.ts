import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { requireAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const RUNWARE_KEY = process.env.RUNWARE_API_KEY!;
const RUNWARE_URL = "https://api.runware.ai/v1";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { images } = (await req.json()) as { images: string[] };

  if (!images?.length) {
    return NextResponse.json({ error: "images required" }, { status: 400 });
  }

  const results: string[] = [];

  for (const imagePath of images) {
    let imageData: string;

    if (imagePath.startsWith("/")) {
      try {
        const filePath = join(process.cwd(), "public", imagePath);
        const buffer = await readFile(filePath);
        const ext = imagePath.split(".").pop()?.toLowerCase() || "jpeg";
        const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        imageData = `data:${mime};base64,${buffer.toString("base64")}`;
      } catch (e) {
        console.error("Failed to read local file:", imagePath, e);
        continue;
      }
    } else if (imagePath.startsWith("http")) {
      imageData = imagePath;
    } else {
      continue;
    }

    try {
      const res = await fetch(RUNWARE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RUNWARE_KEY}`,
        },
        body: JSON.stringify([
          {
            taskType: "imageUpload",
            taskUUID: randomUUID(),
            image: imageData,
          },
        ]),
      });
      const data = await res.json();
      const url = data.data?.[0]?.imageURL;
      if (url) results.push(url);
      else console.error("Runware imageUpload failed:", JSON.stringify(data));
    } catch (e) {
      console.error("Runware upload error:", e);
    }
  }

  return NextResponse.json({ urls: results });
}
