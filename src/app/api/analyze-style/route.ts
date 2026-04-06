import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

export async function POST(req: NextRequest) {
  const { imageUrl } = (await req.json()) as { imageUrl: string };

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";
  let imageData: string;

  function detectMediaType(ext: string): typeof mediaType {
    switch (ext) {
      case "png": return "image/png";
      case "webp": return "image/webp";
      case "gif": return "image/gif";
      default: return "image/jpeg";
    }
  }

  try {
    if (imageUrl.startsWith("/")) {
      const filePath = join(process.cwd(), "public", imageUrl);
      const buffer = await readFile(filePath);
      const ext = imageUrl.split(".").pop()?.toLowerCase() || "jpeg";
      mediaType = detectMediaType(ext);
      imageData = buffer.toString("base64");
    } else {
      const res = await fetch(imageUrl);
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch image: ${res.status}` }, { status: 400 });
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const ct = (res.headers.get("content-type") || "").split(";")[0].trim();
      if (ct === "image/png") mediaType = "image/png";
      else if (ct === "image/webp") mediaType = "image/webp";
      else if (ct === "image/gif") mediaType = "image/gif";
      else mediaType = "image/jpeg";
      imageData = buf.toString("base64");
    }
  } catch (err) {
    console.error("Image read error:", err);
    return NextResponse.json({ error: "Failed to read image" }, { status: 400 });
  }

  if (!imageData || imageData.length < 100) {
    return NextResponse.json({ error: "Image data too small or empty" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageData },
              },
              {
                type: "text",
                text: `You are an expert art style analyzer. Your job: produce a PRECISE style prompt that AI image generators can use to EXACTLY replicate this art style.

## CRITICAL: Character body anatomy
Describe the EXACT body structure in extreme detail:
- HEAD shape & size (circle? oval? square? proportional? oversized?)
- EYES (dots? circles? lines? realistic? anime-large? none?)
- MOUTH (simple line? detailed lips? no mouth?)
- BODY (stick lines? thick body? proportional? blocky?)
- ARMS (single thin lines? detailed arms with hands? noodle arms?)
- LEGS (single thin lines? detailed legs with shoes? stumps?)
- HANDS (none? circles? detailed fingers? mittens?)
- Overall proportions (head-to-body ratio)

## Also describe:
- Line work style (thickness, color, sketch vs clean)
- Color palette (specific colors, warm/cool)
- Shading technique (flat, gradient, cel-shading, none)
- Background style (detailed, simple shapes, gradient, flat color)

## Output format
Output ONLY the style description. Start with "[CHARACTER] ..." for the character design, then "[STYLE] ..." for everything else. Be extremely specific. NO explanations.

## Examples:
"[CHARACTER] stick figure with perfectly round white circle head (3x body width), two black dot eyes, simple curved line mouth, straight thin black line body (single line torso), single thin line arms with no hands, single thin line legs with no feet, head-to-body ratio 1:2. [STYLE] thin black outlines (1-2px), flat cartoon coloring, warm sunset palette (orange, purple, deep blue), simple geometric background shapes, no gradients on characters, soft gradient on sky backgrounds."

"[CHARACTER] chibi anime character with oversized head (1:1 head-to-body), huge round eyes with star highlights, tiny dot nose, small body with stubby limbs, mitten hands, no visible fingers. [STYLE] thick black outlines (3px), pastel color palette, soft cel shading, sparkle effects, kawaii aesthetic."`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Claude Vision error:", err);
      return NextResponse.json({ error: "Claude API error" }, { status: 502 });
    }

    const data = await res.json();
    const styleDescription = data.content?.[0]?.text?.trim() || "";

    return NextResponse.json({ styleDescription });
  } catch (err) {
    console.error("analyze-style error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
