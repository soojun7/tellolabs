import { NextRequest, NextResponse } from "next/server";
import { requireAuth, useCredits } from "@/lib/apiAuth";
import { fetchWithRetry } from "@/lib/fetchRetry";

export const dynamic = "force-dynamic";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

interface CopyBody {
  script: string;
  referenceImageUrl?: string;
  referenceTextElements?: string;
  referenceSummary?: string;
  language?: string;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "suggest-thumbnail-copy");
  if (creditResult instanceof NextResponse) return creditResult;

  try {
    const body: CopyBody = await req.json();
    const { script, referenceImageUrl, referenceTextElements, referenceSummary, language = "ko" } = body;

    const langInstructions = language === "ja"
      ? "日本語で書いてください。"
      : "한국어로 작성해주세요.";

    const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

    if (referenceImageUrl && referenceImageUrl.startsWith("http")) {
      try {
        const imgRes = await fetch(referenceImageUrl);
        const buf = await imgRes.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        const ct = imgRes.headers.get("content-type")?.split(";")[0] || "image/jpeg";
        content.push({
          type: "image",
          source: { type: "base64", media_type: ct, data: b64 },
        });
      } catch { /* skip image */ }
    }

    const hasRefText = referenceTextElements && referenceTextElements !== "없음" && referenceTextElements.trim().length > 0;

    let refStyleGuide = "";
    if (hasRefText) {
      refStyleGuide = `
## 래퍼런스 썸네일 텍스트 분석 (반드시 참고)
래퍼런스 썸네일에 있던 텍스트: "${referenceTextElements}"
${referenceSummary ? `썸네일 요약: ${referenceSummary}` : ""}

## 스타일 모방 규칙 (가장 중요)
- 래퍼런스 텍스트의 **줄 수를 반드시 따라하세요**. 래퍼런스가 2줄이면 모든 카피를 2줄로, 1줄이면 1줄로.
- 래퍼런스 텍스트의 **각 줄 글자 수(길이)를 비슷하게** 맞추세요. 첫째 줄이 짧고 둘째 줄이 길었다면 그 패턴을 유지.
- 래퍼런스 텍스트의 **말투와 톤**을 따라하세요. 의문형이었으면 의문형, 감탄형이었으면 감탄형, 단정형이었으면 단정형.
- 래퍼런스 텍스트에 숫자/기호가 있었다면 비슷하게 숫자/기호를 활용.
- **내용만** 아래 대본의 주제로 바꾸세요. 형식과 스타일은 래퍼런스를 그대로 모방.`;
    }

    content.push({
      type: "text",
      text: `아래 대본을 바탕으로 YouTube 썸네일에 들어갈 카피(텍스트)를 5개 추천해줘.
${langInstructions}
${refStyleGuide}

## 기본 규칙
- 각 카피는 짧고 임팩트 있게
- 호기심을 자극하거나, 충격적이거나, 클릭하고 싶게
- 숫자가 있으면 활용
${hasRefText ? "- 모든 카피의 줄 수와 글자 수를 래퍼런스와 최대한 동일하게" : "- 1줄 카피 3개, 2줄 카피 2개를 추천\n- 2줄 카피는 \"줄1\\n줄2\" 형식으로"}

## 대본
${script.slice(0, 2000)}

JSON 배열로만 응답해줘:
[{"copy": "카피텍스트", "lines": 줄수}, ...]`,
    });

    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Claude API 오류: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "응답 파싱 실패" }, { status: 500 });
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ suggestions });
  } catch (err: unknown) {
    console.error("Copy suggestion error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
