import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { requireAuth, useCredits } from "@/lib/apiAuth";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function detectMediaType(ext: string): MediaType {
  switch (ext) {
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    default: return "image/jpeg";
  }
}

async function loadImageAsBase64(imageUrl: string): Promise<{ data: string; mediaType: MediaType }> {
  if (imageUrl.startsWith("/")) {
    const filePath = join(process.cwd(), "public", imageUrl);
    const buffer = await readFile(filePath);
    const ext = imageUrl.split(".").pop()?.toLowerCase() || "jpeg";
    return { data: buffer.toString("base64"), mediaType: detectMediaType(ext) };
  }

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = (res.headers.get("content-type") || "").split(";")[0].trim();
  let mt: MediaType = "image/jpeg";
  if (ct === "image/png") mt = "image/png";
  else if (ct === "image/webp") mt = "image/webp";
  else if (ct === "image/gif") mt = "image/gif";
  return { data: buf.toString("base64"), mediaType: mt };
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "analyze-thumbnail");
  if (creditResult instanceof NextResponse) return creditResult;

  const { imageUrl } = (await req.json()) as { imageUrl: string };

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  let imageData: string;
  let mediaType: MediaType;

  try {
    const result = await loadImageAsBase64(imageUrl);
    imageData = result.data;
    mediaType = result.mediaType;
  } catch (err) {
    console.error("Image read error:", err);
    return NextResponse.json({ error: "이미지를 불러올 수 없습니다." }, { status: 400 });
  }

  if (!imageData || imageData.length < 100) {
    return NextResponse.json({ error: "이미지 데이터가 너무 작습니다." }, { status: 400 });
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
        max_tokens: 1024,
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
                text: `이 YouTube 썸네일 이미지를 상세히 분석해주세요. 반드시 아래 JSON 형식으로만 출력하세요.

{
  "background": "배경 설명 (장소, 색감, 조명, 분위기를 구체적으로)",
  "characters": "인물 설명 (인원 수, 각 인물의 포즈, 의상, 표정, 위치를 구체적으로. 인물이 없으면 '인물 없음')",
  "staging": "연출 설명 (카메라 앵글, 구도, 시선 유도, 전체적인 분위기/톤을 구체적으로)",
  "textElements": "이미지에 보이는 텍스트/타이포그래피 요소들 (위치, 크기, 색상 포함. 없으면 '없음')",
  "summary": "이 썸네일을 한 줄로 요약"
}

JSON만 출력하세요. 설명이나 마크다운 코드블록 없이 순수 JSON만 출력하세요.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Claude Vision error:", err);
      return NextResponse.json({ error: "Claude API 오류" }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text?.trim() || "";

    try {
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      const analysis = JSON.parse(cleaned);
      return NextResponse.json({ analysis });
    } catch {
      return NextResponse.json({
        analysis: {
          background: raw,
          characters: "",
          staging: "",
          textElements: "",
          summary: "",
        },
      });
    }
  } catch (err) {
    console.error("analyze-thumbnail error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
