import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { requireAuth, useCredits } from "@/lib/apiAuth";
import { fetchWithRetry } from "@/lib/fetchRetry";

export const dynamic = "force-dynamic";

const RUNWARE_KEY = process.env.RUNWARE_API_KEY!;
const RUNWARE_URL = "https://api.runware.ai/v1";

interface GenImageBody {
  prompt: string;
  model?: string;
  stylePrompt?: string;
  styleImage?: string;
  characterDesc?: string;
  characterRefImage?: string;
  width?: number;
  height?: number;
  cachedRefUrls?: string[];
  styleDescription?: string;
}

const NATIVE_DIMS: Record<string, [number, number]> = {
  "google:4@3": [1376, 768],
  "google:4@2": [1376, 768],
  "alibaba:qwen-image@2.0-pro": [1264, 848],
  "alibaba:wan@2.7-image-pro": [1264, 848],
  "bytedance:seedream@5.0-lite": [1264, 848],
};

function isNative(model: string) {
  return (
    model.startsWith("google:") ||
    model.startsWith("alibaba:") ||
    model.startsWith("bytedance:")
  );
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
  } else {
    imageData = imagePath;
  }

  try {
    const res = await fetchWithRetry(RUNWARE_URL, {
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

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "generate-image");
  if (creditResult instanceof NextResponse) return creditResult;

  const body = (await req.json()) as GenImageBody;

  if (!body.prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const model = body.model || "google:4@3";
  const native = isNative(model);

  const [width, height] = native
    ? (NATIVE_DIMS[model] || [1024, 1024])
    : [body.width || 1920, body.height || 1088];

  const useVisionPrompt = native && !!body.styleDescription;
  const hasRefImage = !useVisionPrompt && !!(body.styleImage || body.characterRefImage || (body.cachedRefUrls && body.cachedRefUrls.length > 0));
  const hasStylePrompt = !!body.stylePrompt;

  let positivePrompt = "ABSOLUTE RULE: Do NOT include any text, typography, letters, numbers, words, captions, subtitles, or watermarks in the image. ";

  if (useVisionPrompt) {
    positivePrompt += `You MUST follow this exact art style: ${body.styleDescription}. `;
    positivePrompt += "DO NOT draw realistic humans unless the style explicitly says so. ";
  } else if (hasStylePrompt || hasRefImage) {
    if (hasStylePrompt) {
      positivePrompt += `${body.stylePrompt}. `;
    }

    if (hasRefImage) {
      positivePrompt += "Use the reference image ONLY as art style and color palette inspiration. Create a completely NEW composition and scene — do NOT copy the layout, pose, or composition of the reference. ";
      if (!hasStylePrompt) {
        positivePrompt += "Match the drawing style, line work, and coloring technique of the reference, but the scene content must be entirely different. ";
      }
    }

    positivePrompt += "DO NOT draw realistic humans if the style is cartoon/stickman/anime. ";
  }

  if (body.characterDesc) {
    positivePrompt += `[Character: ${body.characterDesc}] `;
  }

  let scenePrompt = body.prompt;
  if (useVisionPrompt || hasStylePrompt || hasRefImage) {
    scenePrompt = scenePrompt
      .replace(/\b(realistic|photorealistic|photo|photograph)\b/gi, "")
      .replace(/\b(Korean|Japanese|Chinese|Asian|young|old|elderly)\s+(man|woman|person|boy|girl|businessman|worker|professional|couple)\b/gi, (match) => {
        if (/couple/i.test(match)) return "two characters";
        return "character";
      })
      .replace(/\ba (man|woman|person|boy|girl)\b/gi, "a character")
      .replace(/\b(men|women|people|guys|girls|workers|professionals|businessmen)\b/gi, "characters");
  }

  positivePrompt += `[Scene: ${scenePrompt}]`;
  positivePrompt += ", high quality, no text, no watermark, no typography, no letters";

  const taskPayload: Record<string, unknown> = {
    taskType: "imageInference",
    taskUUID: randomUUID(),
    positivePrompt,
    width,
    height,
    model,
    numberResults: 1,
  };

  if (!native) {
    taskPayload.negativePrompt =
      "text, words, letters, numbers, typography, captions, subtitles, watermark, logo, blurry, low quality, distorted, deformed, written text, handwriting, signs with text";
    taskPayload.steps = 28;
  }

  if (!useVisionPrompt) {
    const refImages: string[] = [];

    if (body.cachedRefUrls && body.cachedRefUrls.length > 0) {
      refImages.push(...body.cachedRefUrls);
    } else {
      if (body.styleImage) {
        const uploaded = await resolveImageForRunware(body.styleImage);
        if (uploaded) refImages.push(uploaded);
        else console.error("Style image upload failed for:", body.styleImage);
      }

      if (body.characterRefImage) {
        const uploaded = await resolveImageForRunware(body.characterRefImage);
        if (uploaded) refImages.push(uploaded);
        else console.error("Character ref image upload failed for:", body.characterRefImage);
      }
    }

    if (refImages.length > 0) {
      taskPayload.inputs = { referenceImages: refImages };
    }
  }

  console.log("Generate payload:", {
    model,
    useVisionPrompt,
    hasRefImage,
    hasRefInputs: !!taskPayload.inputs,
    promptPreview: positivePrompt.slice(0, 200),
  });

  try {
    const res = await fetchWithRetry(RUNWARE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RUNWARE_KEY}`,
      },
      body: JSON.stringify([taskPayload]),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Runware API error:", res.status, err);
      return NextResponse.json(
        { error: `Runware API: ${res.status}`, detail: err },
        { status: 502 },
      );
    }

    const data = await res.json();

    if (data.errors?.length > 0) {
      console.error("Runware errors:", data.errors);
      return NextResponse.json(
        { error: data.errors[0].message },
        { status: 500 },
      );
    }

    const imageUrl = data.data?.[0]?.imageURL;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image returned", data },
        { status: 500 },
      );
    }

    return NextResponse.json({ imageUrl });
  } catch (err: unknown) {
    console.error("generate-image error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
