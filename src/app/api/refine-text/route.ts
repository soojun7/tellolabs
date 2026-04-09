import { NextRequest, NextResponse } from "next/server";
import { requireAuth, useCredits } from "@/lib/apiAuth";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

interface SceneInput {
  line: string;
  keywords: string[];
  motionStyle: string;
}

interface RefinedOutput {
  displayText: string;
  subText: string;
  highlightKeywords: string[];
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "refine-text");
  if (creditResult instanceof NextResponse) return creditResult;

  const body = await req.json();
  const scenes: SceneInput[] = body.scenes;

  if (!scenes?.length) {
    return NextResponse.json({ error: "scenes required" }, { status: 400 });
  }

  const scenesDesc = scenes
    .map(
      (s, i) =>
        `[장면 ${i + 1}]\n대본: "${s.line}"\n키워드: ${s.keywords.join(", ")}`,
    )
    .join("\n\n");

  const prompt = `당신은 유튜브 뉴스/정보 영상의 모션 그래픽 텍스트를 만드는 전문가입니다.

## 목표
나레이션 대본(긴 문장)을 화면에 보여줄 핵심 문구로 가공합니다.

## 레퍼런스 예시
대본: "대통령의 낮은 지지율 등 주요 지표는 민주당에 유리한 환경을 시사한다고 봤다"
→ displayText: "대통령의 낮은 지지율 등 주요 지표는\\n민주당에 유리한 환경을 시사한다"고 봤다

대본: "1970년대 초반만 해도 연봉 몇 년치면 서울에 집을 살 수 있었어요. 정확한 통계는 없지만 지금보다 훨씬 낮았습니다. 근데 2024년 공식 통계 기준으로는 서울 자가 아파트 가격이 연소득의 약 14배 수준이에요."
→ displayText: "2024년 기준\\n서울 아파트 가격은 연소득의 약 14배"

## 핵심 규칙
1. 대본을 그대로 넣지 마세요. 가장 임팩트 있는 핵심 팩트 하나만 추출하세요.
2. 총 길이 25~50자 내외 (줄바꿈 포함). 레퍼런스처럼 1~2줄.
3. 숫자/데이터가 있으면 반드시 포함하세요 (14배, 1천304억 원, 297명 등).
4. "~에 따르면", "~라고 밝혔다", "~것으로 알려졌다" 같은 보도 어투는 제거.
5. 따옴표("")가 적절한 경우 사용하되, 따옴표 밖에 "고 봤다", "라고 전했다" 같은 짧은 귀속을 붙일 수 있음.
6. 줄바꿈(\\n)을 활용해 2줄로 나눠 가독성을 높이세요.
7. subText는 빈 문자열로 두세요 (사용하지 않음).
8. highlightKeywords: 화면에서 노란색으로 강조할 핵심 단어/숫자 (2~4개).

${scenesDesc}

응답 형식 (JSON 배열만, 코드블록 없이):
[{"displayText": "...", "subText": "", "highlightKeywords": ["...", "..."]}, ...]`;

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
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json(
        { error: `Claude API: ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse response", raw: text },
        { status: 500 },
      );
    }

    const results: RefinedOutput[] = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("refine-text error:", err);
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
