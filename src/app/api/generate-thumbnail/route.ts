import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { requireAuth, useCredits } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const RUNWARE_KEY = process.env.RUNWARE_API_KEY!;
const RUNWARE_URL = "https://api.runware.ai/v1";

interface AnalysisResult {
  background?: string;
  characters?: string;
  staging?: string;
  textElements?: string;
  summary?: string;
}

interface Customizations {
  background?: string;
  characters?: string;
  staging?: string;
}

interface ThumbnailBody {
  referenceImageUrl?: string;
  analysisResult?: AnalysisResult;
  customizations?: Customizations;
  projectStylePrompt?: string;
  projectStyleImage?: string;
  script?: string;
}

async function resolveImageForRunware(imagePath: string): Promise<string | null> {
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
      return null;
    }
  } else if (imagePath.startsWith("http")) {
    imageData = imagePath;
  } else {
    return null;
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
    if (!url) {
      console.error("Runware imageUpload failed:", JSON.stringify(data));
    }
    return url || null;
  } catch (e) {
    console.error("Runware upload error:", e);
    return null;
  }
}

function buildPrompt(body: ThumbnailBody): string {
  const { analysisResult, customizations, projectStylePrompt, script } = body;

  const parts: string[] = [];

  parts.push("CRITICAL RULE — MUST FOLLOW FIRST: Remove ALL text, ALL typography, ALL letters, ALL words, ALL watermarks from the image. The output must be a completely clean image with absolutely zero text of any kind.");

  if (analysisResult) {
    parts.push("Based on the reference thumbnail analysis:");

    const bg = customizations?.background
      ? `Background: ${customizations.background}`
      : analysisResult.background
        ? `Background (keep original): ${analysisResult.background}`
        : null;
    if (bg) parts.push(bg);

    const chars = customizations?.characters
      ? `Characters: ${customizations.characters}`
      : analysisResult.characters
        ? `Characters (keep original): ${analysisResult.characters}`
        : null;
    if (chars) parts.push(chars);

    const stg = customizations?.staging
      ? `Staging/Composition: ${customizations.staging}`
      : analysisResult.staging
        ? `Staging (keep original): ${analysisResult.staging}`
        : null;
    if (stg) parts.push(stg);
  } else if (script) {
    parts.push(`A YouTube thumbnail scene based on this content: ${script}`);
  }

  if (projectStylePrompt) {
    parts.push(`Art style: ${projectStylePrompt}`);
  }

  parts.push("YouTube thumbnail style, eye-catching composition, vibrant colors, high contrast, professional quality.");
  parts.push("REMINDER: NO text, NO typography, NO letters, NO words, NO watermark. Clean image only.");

  return parts.join("\n");
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "generate-thumbnail");
  if (creditResult instanceof NextResponse) return creditResult;

  try {
    const body: ThumbnailBody = await req.json();
    const { referenceImageUrl, projectStyleImage } = body;

    const positivePrompt = buildPrompt(body);

    const refImages: string[] = [];

    if (referenceImageUrl) {
      const uploaded = await resolveImageForRunware(referenceImageUrl);
      if (uploaded) refImages.push(uploaded);
      else console.error("Reference image upload failed for:", referenceImageUrl);
    }

    if (projectStyleImage) {
      const uploaded = await resolveImageForRunware(projectStyleImage);
      if (uploaded) refImages.push(uploaded);
      else console.error("Style image upload failed for:", projectStyleImage);
    }

    const taskPayload: Record<string, unknown> = {
      taskType: "imageInference",
      taskUUID: randomUUID(),
      positivePrompt,
      model: "google:4@2",
      width: 1376,
      height: 768,
      numberResults: 1,
      outputType: ["URL"],
    };

    if (refImages.length > 0) {
      taskPayload.inputs = { referenceImages: refImages };
    }

    console.log("Thumbnail generate payload:", {
      hasRefImages: refImages.length,
      refImages,
      promptPreview: positivePrompt.slice(0, 200),
    });

    const res = await fetch(RUNWARE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RUNWARE_KEY}`,
      },
      body: JSON.stringify([taskPayload]),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Runware thumbnail error:", errText);
      return NextResponse.json({ error: `Runware API 오류: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const result = data?.data?.[0];
    if (!result?.imageURL) {
      return NextResponse.json({ error: "이미지 생성 실패" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl: result.imageURL });
  } catch (err: unknown) {
    console.error("Thumbnail generation error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
