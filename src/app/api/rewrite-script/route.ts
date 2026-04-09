import { NextRequest, NextResponse } from "next/server";
import { requireAuth, useCredits } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

interface RewriteBody {
  originalScript: string;
  targetLanguage: "ko" | "ja";
  guidelines?: string;
  durationMinutes?: number;
}

const DURATION_GUIDE: Record<number, { chars: string; minChars: number; lines: string; maxTokens: number }> = {
  5:  { chars: "2,300~2,800자", minChars: 2300, lines: "약 15~25줄", maxTokens: 8192 },
  10: { chars: "5,000~5,500자", minChars: 5000, lines: "약 30~50줄", maxTokens: 16000 },
  15: { chars: "7,000~8,000자", minChars: 7000, lines: "약 45~70줄", maxTokens: 16000 },
  20: { chars: "9,500~10,500자", minChars: 9500, lines: "약 60~90줄", maxTokens: 16000 },
};

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "rewrite-script");
  if (creditResult instanceof NextResponse) return creditResult;

  try {
    const body: RewriteBody = await req.json();
    const { originalScript, targetLanguage, guidelines, durationMinutes } = body;

    if (!originalScript?.trim()) {
      return NextResponse.json({ error: "원본 대본이 필요합니다." }, { status: 400 });
    }

    const langName = targetLanguage === "ja" ? "일본어" : "한국어";
    const dur = durationMinutes && DURATION_GUIDE[durationMinutes]
      ? durationMinutes
      : 10;
    const guide = DURATION_GUIDE[dur];

    const systemPrompt = `당신은 전문 YouTube 영상 나레이션 스크립트 작가입니다.

## 절대 규칙 (반드시 지켜야 함)

### 분량 규칙 (최우선)
- 이 대본은 **${dur}분 분량** 영상용입니다.
- 한국어 나레이션은 분당 약 500자입니다.
- 따라서 반드시 **총 ${guide.chars}** (최소 ${guide.minChars}자 이상) 분량으로 작성하세요.
- 줄 수는 ${guide.lines}이어야 합니다.
- ⚠️ 분량이 부족하면 절대 안 됩니다. ${guide.minChars}자 미만은 실패입니다.
- 원본 길이와 관계없이 반드시 ${dur}분 분량을 맞추세요.
- 내용이 부족하면 관련 배경 설명, 사례, 비유, 시청자 질문 등을 추가하여 분량을 채우세요.

### 줄 길이 규칙
- 한 줄(줄바꿈 기준)은 **최소 100자, 최대 200자**여야 합니다.
- 50자 이하로 끝나는 짧은 줄 절대 금지.
- 짧은 문장은 "~는데", "~했고", "~면서", "~거든요" 등 연결어로 묶어 한 줄로 이어야 합니다.
- 줄이 200자를 넘으면 적절한 지점에서 줄바꿈하세요.

### 출력 규칙
- 스크립트 본문만 출력하세요.
- 제목, 소제목, 번호 매기기, 코드블록, 마크다운, 설명, 주석 절대 금지.
- 복사-붙여넣기만으로 바로 사용할 수 있는 순수 나레이션 텍스트만 출력하세요.
- 마지막까지 내용을 완성하고 끝내세요. 중간에 끊기면 안 됩니다.`;

    const userPrompt = `아래 원본 대본(자막)을 참고하여, 완전히 새로운 ${langName} 영상 대본을 작성해주세요.

## 작성 규칙
1. **유사도 50% 이하**: 원본과 문장 구조, 표현, 단어 선택이 완전히 달라야 합니다. 같은 주제를 다루되 새로운 관점, 새로운 표현, 새로운 구성으로 작성하세요.
2. **${langName}로 작성**: 자연스러운 ${langName} 구어체로 작성하세요. 단순 번역이 아닌, ${langName} 화자가 자연스럽게 말하는 톤이어야 합니다.
3. **나레이션 포맷**: TTS로 읽힐 대본이므로 한 줄당 100~200자의 의미 단위로 끊어주세요.
4. **퀄리티**: 시청자의 흥미를 끄는 도입, 핵심 정보 전달, 감정적 마무리가 있어야 합니다.
5. **분량 (가장 중요)**: 반드시 **${guide.chars}** (최소 ${guide.minChars}자, ${guide.lines}) 분량을 채우세요. 부족하면 관련 사례, 배경지식, 비유 등을 추가해서 반드시 분량을 맞추세요.

${guidelines ? `## 사용자 지침 (반드시 따르세요)\n${guidelines}\n` : ""}
## 원본 대본 (참고용)
${originalScript.slice(0, 12000)}

## 출력
${dur}분 분량(최소 ${guide.minChars}자 이상, ${guide.chars})의 새로운 ${langName} 나레이션 대본만 출력하세요. 한 줄 100~200자를 유지하세요. 반드시 끝까지 완성하세요.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: guide.maxTokens,
        messages: [
          { role: "user", content: userPrompt },
        ],
        system: systemPrompt,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude rewrite error:", errText);
      return NextResponse.json({ error: `Claude API 오류: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const rewritten = data.content?.[0]?.text || "";

    return NextResponse.json({ script: rewritten.trim() });
  } catch (err: unknown) {
    console.error("Rewrite error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
