import { NextRequest, NextResponse } from "next/server";
import { requireAuth, useCredits } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const CHUNK_SIZE = 80;
const MAX_CONCURRENCY = 3;

interface LineAnalysis {
  shouldMotion: boolean;
  suggestedStyle: string;
  reason: string;
}

function buildPrompt(lines: string[], globalOffset: number, totalLines: number): string {
  const linesDesc = lines.map((l, i) => `[${globalOffset + i + 1}] ${l}`).join("\n");
  const motionBudget = Math.max(1, Math.floor(lines.length * 0.2));

  return `당신은 유튜브 뉴스/정보 영상의 모션 그래픽 전문가입니다.

아래는 전체 ${totalLines}줄 대본 중 ${globalOffset + 1}~${globalOffset + lines.length}번째 줄입니다.
각 줄이 **모션 그래픽으로 표현하면 효과적인지** 판단하고, 적합한 스타일을 추천하세요.

## 핵심 규칙: 모션은 극소수만!
- 이 ${lines.length}줄 중 모션(shouldMotion=true)은 **최대 ${motionBudget}개 이하**만 선택하세요.
- 나머지는 전부 이미지 씬(shouldMotion=false)으로 설정하세요.
- 정말 데이터/통계/비교가 확실한 핵심 줄만 모션으로 선택하세요.
- 애매하면 무조건 이미지 씬(shouldMotion=false)으로 하세요.

## 모션이 적합한 경우 (매우 엄격하게 선별)
- 구체적 숫자/데이터/통계가 핵심인 줄 (예: "14배", "300조원", "90%")
- 명확한 좌우 비교/대비 구조 (예: "A는 ~인 반면, B는 ~")
- 시계열 추이 데이터 (여러 연도의 수치 변화)

## 이미지 씬으로 처리할 것 (대부분의 줄)
- 설명/서술 문장
- 인용/발언 (이미지 + 자막이 더 효과적)
- 감정/의견 표현
- 전환/접속 문장
- 단순 보충 설명
- 인사/마무리

## 스타일 종류 (모션인 경우만, 대본에 가장 어울리는 것을 다양하게 선택)
- quote: 인용/발언/짧은 팩트 전달
- bottomCaption: 긴 정보 전달, 이미지와 함께 보여줄 설명
- comparison / comparisonDark: 두 대상의 비교/대비
- bigStat / bigStatDark: 핵심 숫자 하나를 크게 강조
- list: 여러 항목 나열
- lineChart: 시계열 추이/변화 데이터
- barChart: 여러 항목의 수치 크기/차이 비교 막대그래프
- circularProgress: 점유율, 비율 등 0~100 사이 수치 표시
- vsCompare: 두 대상을 거대한 대결(VS) 구도로 극적 비교
- twitterPost: SNS 트윗, 네티즌 반응, 여론, 발언
- cardGrid: 여러 가지 특징, 장점, 요인을 카드 형태로 나열
- profileCard: 전문가, 핵심 인물 프로필 및 핵심 의견
- orchestra: 중심 개념과 주변의 연관/파생 네트워크
- timeline: 연도별 역사, 시간 순서, 단계별 프로세스
- checklist: 체크해야 할 필수 조건, 확인 사항
- beforeAfter: 과거/현재, 문제/해결책 등 전후 비교
- progressBars: 여러 항목의 가로 막대 진행률 비교
- testimonial: 인물의 거대한 인용구와 프로필
- browserMockup: 웹사이트 화면, 인터넷 검색 결과, 온라인 상의 내용
- terminal: 코딩, 해커, 명령프롬프트, 시스템 오류 등 기술적 상황
- alertModal: 긴급 에러창, 강력한 경고 팝업, 중요한 알림창
- iMessage: 두 사람의 문자 대화, 스마트폰 메신저 톡
- stickyNotes: 브레인스토밍, 포스트잇 아이디어 나열
- newsCard: 뉴스 속보(Breaking News) 스타일의 충격적인 타이틀
- featureCards: 세 가지 핵심 아이콘과 설명 나열
- gauge: 속도계/게이지 형태로 위험도, 진행도 표시
- tableCompare: O/X가 들어간 표 형태의 스펙/기능 비교
- milestone: 목표를 향한 긴 여정, 마일스톤 단계 표시
- mapPin: 지도 위 특정 위치, 장소, 국가, 도시 표시
- routeMap: 출발지부터 도착지까지의 경로, 이동선, 여행, 경유지
- locationList: 여러 장소들의 거리/이름/리뷰 목록 나열
- zoomMap: 세계지도에서 특정 국가/도시로 줌인 + 국기/국가명 표시 (1x→3x 줌 애니메이션)
- panMap: 출발지에서 도착지로 카메라 팬 이동 3단계 (줌인→팬→도착지 표시) + 점선 화살표
- flightPath: 곡선 비행 경로 + 비행기 아이콘이 따라 이동 + 거리/시간 정보 표시
- pulseMap: 진원지/핫스팟/발원지에서 펄스 링이 확산되는 애니메이션 + 위치 강조
- pixelCharacter: 픽셀/도트 그래픽 캐릭터가 등장하여 대사 전달, 레트로 감성
- avatarSpeech: 아바타 캐릭터가 옆에서 등장하여 말풍선으로 인터뷰, 대사, 질문 전달
- emojiScene: 여러 이모지들이 화면에 팝업되며 감정, 기분, 반응 시각화

## 모션 종류 다양화 및 균형 유지 (매우 중요!)
- **기본 레이아웃 골고루 분산**: 단순한 서술, 설명, 인용 문장에서는 'quote'(인용)나 'bottomCaption'(하단 자막) 같은 기본 레이아웃을 사용하되, **절대 영상 초반(1~10번 씬 등)에 연달아 몰아서 쓰지 마세요!** 전체 영상에 걸쳐서 차트/인포그래픽과 섞이도록 징검다리처럼 적절히 분산시켜야 합니다.
- **새로운 레이아웃 다채롭게 활용**: 대본의 맥락(웹, 문자, 경고창, 뉴스, 터미널, 통계 등)을 파악하여 새롭게 추가된 20개 이상의 차트/인포그래픽 레이아웃들을 적극적으로 섞어서 활용하세요.

⚠️ **절대 금지사항**:
1. **특정 모션 몰아서 쓰기 금지**: 1번부터 8번 씬까지 전부 'quote'만 나오는 등, 초반에 특정 레이아웃 하나로 도배하는 행위를 절대 금지합니다. 첫 씬부터 다채로운 레이아웃(newsCard, twitterPost 등)을 적극 시도하세요.
2. **연속된 모션 반복 금지**: 바로 앞 씬에서 고른 레이아웃을 다음 씬에서 똑같이 또 고르지 마세요. (예: quote 연달아 2번 금지, bigStat 연달아 2번 금지)
3. **특정 모션 편식 금지**: 수치(숫자)가 나오더라도 무조건 bigStat만 쓰지 말고, barChart, circularProgress, progressBars, gauge 등을 섞어서 쓰세요.
4. A와 B의 대조가 나오더라도 무조건 comparison만 쓰지 말고, tableCompare, vsCompare, beforeAfter 등 다양한 비교 레이아웃을 활용하세요.

대본:
${linesDesc}

정확히 ${lines.length}개 항목의 JSON 배열로 응답하세요. 다른 텍스트 없이 JSON만:
[{"shouldMotion": true/false, "suggestedStyle": "quote", "reason": "짧은이유"}, ...]`;
}

async function analyzeChunk(
  lines: string[],
  globalOffset: number,
  totalLines: number,
): Promise<LineAnalysis[]> {
  const prompt = buildPrompt(lines, globalOffset, totalLines);
  const maxTokens = Math.max(2048, lines.length * 60);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      temperature: 0.8,
      max_tokens: Math.min(maxTokens, 8192),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Anthropic API error (chunk offset=${globalOffset}):`, err);
    throw new Error(`Claude API: ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    console.error(`Failed to parse chunk offset=${globalOffset}, raw:`, text.slice(0, 200));
    return lines.map(() => ({ shouldMotion: false, suggestedStyle: "quote", reason: "분석 실패" }));
  }

  const parsed: LineAnalysis[] = JSON.parse(jsonMatch[0]);

  if (parsed.length < lines.length) {
    const pad = lines.length - parsed.length;
    for (let i = 0; i < pad; i++) {
      parsed.push({ shouldMotion: false, suggestedStyle: "quote", reason: "" });
    }
  }

  return parsed.slice(0, lines.length);
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "analyze-lines");
  if (creditResult instanceof NextResponse) return creditResult;

  const { lines } = (await req.json()) as { lines: string[] };

  if (!lines?.length) {
    return NextResponse.json({ error: "lines required" }, { status: 400 });
  }

  try {
    const chunks: { start: number; items: string[] }[] = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      chunks.push({ start: i, items: lines.slice(i, i + CHUNK_SIZE) });
    }

    const allResults: LineAnalysis[] = new Array(lines.length);

    for (let batch = 0; batch < chunks.length; batch += MAX_CONCURRENCY) {
      const batchChunks = chunks.slice(batch, batch + MAX_CONCURRENCY);
      const batchResults = await Promise.all(
        batchChunks.map((c) => analyzeChunk(c.items, c.start, lines.length)),
      );
      batchChunks.forEach((c, bi) => {
        const results = batchResults[bi];
        results.forEach((r, ri) => {
          allResults[c.start + ri] = r;
        });
      });
    }

    for (let i = 0; i < allResults.length; i++) {
      if (!allResults[i]) {
        allResults[i] = { shouldMotion: false, suggestedStyle: "quote", reason: "" };
      }
    }

    const motionCount = allResults.filter((r) => r.shouldMotion).length;
    const maxMotion = Math.floor(lines.length * 0.25);

    if (motionCount > maxMotion) {
      const motionIndices = allResults
        .map((r, i) => ({ i, r }))
        .filter(({ r }) => r.shouldMotion)
        .sort((a, b) => {
          const scoreA = hasStrongData(lines[a.i]) ? 1 : 0;
          const scoreB = hasStrongData(lines[b.i]) ? 1 : 0;
          return scoreB - scoreA;
        });

      for (let k = maxMotion; k < motionIndices.length; k++) {
        allResults[motionIndices[k].i].shouldMotion = false;
      }
    }

    return NextResponse.json({ results: allResults });
  } catch (err: unknown) {
    console.error("analyze-lines error:", err);
    return NextResponse.json({ error: (err as Error).message ?? "Unknown" }, { status: 500 });
  }
}

function hasStrongData(line: string): boolean {
  return /\d+[%배조억만원달러엔]|\d+\.\d+/.test(line);
}
