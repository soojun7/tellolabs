import { NextRequest, NextResponse } from "next/server";
import { requireAuth, useCredits } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

interface SceneInput {
  line: string;
  keywords: string[];
  suggestedStyle?: string;
  sceneType?: string;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "analyze-scenes");
  if (creditResult instanceof NextResponse) return creditResult;

  const { scenes, language, userImageDirective, stylePrompt } = (await req.json()) as {
    scenes: SceneInput[];
    language?: string;
    userImageDirective?: string;
    stylePrompt?: string;
  };
  const isJapanese = language === "ja";
  const isGroundedStyle = true; // 강제로 모든 스타일을 현실적/일상적으로 고정 (정보성 유튜브 영상이므로)

  if (!scenes?.length) {
    return NextResponse.json({ error: "scenes required" }, { status: 400 });
  }

  const scenesDesc = scenes
    .map(
      (s, i) =>
        `[장면 ${i + 1}] 타입: ${s.sceneType ?? "motion"} | 추천스타일: ${s.suggestedStyle ?? "auto"}\n대본: "${s.line}"\n키워드: ${s.keywords.join(", ")}`,
    )
    .join("\n\n");

  const jaSubtitleDirective = isJapanese
    ? `\n\n## ★ 일본어 자막 규칙
대본이 일본어입니다. 자막(displayText)도 반드시 일본어로 작성하세요.
- displayText는 대본의 핵심만 20~35자의 짧은 일본어 한 줄로 추출
- 「」안의 인용문이 있으면 인용문 중심으로
- 数字(숫자) 포함 문장을 우선
- 不要な修飾語(불필요한 수식어), 報道口調(보도 어투)は削除
- highlightKeywords도 일본어로 작성\n`
    : "";

  const userDirective = userImageDirective
    ? `\n\n## ★★★ 사용자 이미지 추가 지시사항 (최우선 반영) ★★★
아래 지시사항을 **모든 장면의 imagePrompt에 반드시 반영**하세요:
"${userImageDirective}"
이 지시사항은 모든 이미지 프롬프트의 기본 설정으로 적용됩니다. 장면 내용과 자연스럽게 결합하세요.`
    : "";

  const styleDirective = stylePrompt
    ? `\n\n## ★★★ 이미지 스타일 지시사항 (최우선 반영) ★★★
사용자가 선택한 이미지 스타일: "${stylePrompt}"
imagePrompt를 작성할 때 이 스타일과 **절대 충돌하지 않게** 하세요.
${isGroundedStyle ? `이 스타일은 일상적/현실적 분위기입니다. 따라서:
- 판타지/SF/초현실적 요소 절대 금지 (거대한 화살표, 폭발, 마법 효과, 네온 글로우 등)
- 과장된 연출 대신 **자연스럽고 생활감 있는 연출**을 사용하세요
- 일상적 공간, 현실적 소품, 자연스러운 포즈와 표정
- 드라마틱한 조명 대신 자연광, 실내등 같은 현실적 조명
- "cinematic" 보다는 "warm", "cozy", "clean", "soft lighting" 등의 분위기어 사용` : "이 스타일의 분위기와 톤에 맞게 imagePrompt를 작성하세요."}`
    : "";

  const prompt = `당신은 유튜브 뉴스/정보 영상의 모션 그래픽 데이터를 생성하는 전문가입니다.

각 장면의 대본을 분석하여 최종 motionStyle을 확정하고, 해당 스타일에 맞는 구조화된 데이터를 생성하세요.
또한, 각 장면의 배경 이미지로 사용할 AI 이미지 생성 프롬프트(영어)도 함께 만드세요.${styleDirective}${userDirective}${jaSubtitleDirective}

## 모션 종류 다양화 및 균형 유지 (매우 중요!)
- **기본 레이아웃 필수 사용**: 단순한 서술, 설명, 인용 문장에서는 'quote'(인용)나 'bottomCaption'(하단 자막) 같은 기본 레이아웃을 반드시 적절히 사용하세요. (전체의 약 30~40% 비율)
- **새로운 레이아웃 다채롭게 활용**: 대본의 맥락(웹, 문자, 경고창, 뉴스, 터미널, 통계 등)을 파악하여 새롭게 추가된 20개 이상의 차트/인포그래픽 레이아웃들을 적극적으로 섞어서 활용하세요.

⚠️ **절대 금지사항**:
1. **연속된 모션 반복 금지**: 바로 앞 씬에서 고른 레이아웃을 다음 씬에서 똑같이 또 고르지 마세요. (예: bigStat 연달아 2번 금지)
2. **특정 모션 편식 금지**: 수치(숫자)가 나오더라도 무조건 bigStat만 쓰지 말고, barChart, circularProgress, progressBars, gauge 등을 섞어서 쓰세요.
3. A와 B의 비교/대조가 나오더라도 무조건 comparison만 쓰지 말고, tableCompare, vsCompare, beforeAfter 등을 다채롭게 번갈아가며 사용하세요. 전체 영상이 지루하지 않게 다채로운 모션 스타일을 구성하세요.

## 스타일별 데이터 스키마

### quote / bottomCaption
displayText: 핵심 팩트 ${isJapanese ? "20~35字の日本語" : "25~50자"} (줄바꿈\\n 가능)
highlightKeywords: ${isJapanese ? "日本語の" : ""}노란색 강조 단어 2~4개
sourceLabel: 출처/발화자 정보 (선택). 대본에 "~에 따르면", "~가 밝혔다", "~교수", "~위원장" 등 발화 주체가 있으면 "직함\\n이름" 형태로. 없으면 빈 문자열.

### comparison
infographicData: {
  "layout": "comparison",
  "title": "비교 제목",
  "leftCard": { "label": "라벨", "color": "#e53935", "items": ["항목1", "항목2"], "summary": "요약" },
  "rightCard": { "label": "라벨", "color": "#1e88e5", "items": ["항목1", "항목2"], "summary": "요약" },
  "footer": "하단 맥락 텍스트 (선택)"
}

### bigStat
infographicData: {
  "layout": "bigStat",
  "category": "카테고리",
  "number": "14",
  "unit": "배",
  "description": "설명문"
}

### list
infographicData: {
  "layout": "list",
  "title": "제목",
  "items": [{ "label": "항목명", "value": "값/설명" }]
}

### lineChart
infographicData: {
  "layout": "lineChart",
  "title": "차트 제목",
  "yMax": 100,
  "points": [{ "x": "라벨", "y": 숫자 }],
  "annotations": [{ "xIndex": 0, "label": "주석" }],
  "lineColor": "#e53935"
}

### cardGrid (번호가 매겨진 여러 개의 카드 나열, 핵심 특징/장점 소개용)
infographicData: {
  "layout": "cardGrid",
  "title": "그리드 제목",
  "cards": [{ "number": 1, "title": "카드 제목", "description": "설명" }]
}

### profileCard (특정 인물/전문가/직업 소개용)
infographicData: {
  "layout": "profileCard",
  "name": "인물/직업 이름",
  "role": "역할/직함",
  "quote": "인용문/핵심 대사",
  "stats": [{ "label": "특징 라벨", "value": "값" }]
}

### orchestra (중앙의 핵심 개념과 주변의 연관 개념/노드들을 방사형으로 보여줄 때)
infographicData: {
  "layout": "orchestra",
  "centerLabel": "중심 개념",
  "nodes": [{ "label": "주변 개념1" }, { "label": "주변 개념2" }]
}

### timeline (시간 순서, 단계별 진행, 역사적 변화를 보여줄 때)
infographicData: {
  "layout": "timeline",
  "steps": [{ "number": 1, "title": "단계/연도", "description": "설명", "highlight": true }]
}

### checklist (체크해야 할 항목, 조건, 필수 요소 나열)
infographicData: {
  "layout": "checklist",
  "title": "체크리스트 제목",
  "items": [{ "text": "항목1", "checked": true }, { "text": "항목2", "checked": false }]
}

### comparisonDark (어두운 배경의 고급스러운 비교 - comparison과 유사하나 다크 테마)
infographicData: {
  "layout": "comparisonDark",
  "title": "비교 제목",
  "left": { "title": "A", "items": ["특징1"], "summary": "요약" },
  "right": { "title": "B", "items": ["특징2"], "summary": "요약", "highlight": true }
}

### bigStatDark (어두운 배경의 고급스러운 통계/숫자 강조 - 프로그레스 바 포함 가능)
infographicData: {
  "layout": "bigStatDark",
  "category": "카테고리",
  "number": "숫자",
  "unit": "단위",
  "description": "설명",
  "progressValue": 75
}

### circularProgress (비율, 점유율 등을 0~100 사이의 원형 그래프로 보여줄 때)
infographicData: {
  "layout": "circularProgress",
  "title": "제목",
  "percentage": 75,
  "label": "라벨",
  "subtitle": "서브타이틀"
}

### barChart (여러 항목 간의 수치 크기를 막대 그래프로 직관적으로 비교할 때)
infographicData: {
  "layout": "barChart",
  "title": "제목",
  "bars": [{ "label": "항목A", "value": 50 }, { "label": "항목B", "value": 80, "highlight": true }]
}

### vsCompare (두 대상, 의견, 개념을 거대한 대결(VS) 구도로 극적으로 보여줄 때)
infographicData: {
  "layout": "vsCompare",
  "title": "제목",
  "left": { "icon": "🍎", "title": "A", "subtitle": "A설명" },
  "right": { "icon": "🍊", "title": "B", "subtitle": "B설명", "highlight": true }
}

### twitterPost (인물 발언, 네티즌 반응, 여론 등을 SNS 트윗처럼 생생하게 보여줄 때)
infographicData: {
  "layout": "twitterPost",
  "username": "작성자 이름",
  "handle": "유저핸들",
  "content": "발언/반응 내용",
  "time": "오후 3:00",
  "date": "2026년 4월 6일"
}

### beforeAfter (과거/현재, 문제/해결책 등 뚜렷한 전후 비교)
infographicData: {
  "layout": "beforeAfter",
  "title": "비교 제목",
  "before": { "title": "이전", "items": ["문제점1"], "icon": "❌" },
  "after": { "title": "이후", "items": ["해결책1"], "icon": "✅" }
}

### progressBars (여러 항목의 진행률이나 퍼센트를 가로 막대 여러 개로 보여줄 때)
infographicData: {
  "layout": "progressBars",
  "title": "제목",
  "items": [{ "label": "항목1", "value": 80 }]
}

### testimonial (특정 인물의 중요한 발언이나 리뷰를 큰 따옴표와 함께 강조)
infographicData: {
  "layout": "testimonial",
  "quote": "인용구 내용",
  "author": { "name": "이름", "role": "직함" }
}

### browserMockup (웹사이트 주소, 검색 결과 등 인터넷 화면을 보여줄 때)
infographicData: {
  "layout": "browserMockup",
  "url": "www.example.com",
  "title": "화면 제목",
  "subtitle": "설명"
}

### terminal (코딩, 해킹, 시스템 에러, 기술적 명령어 등을 연출할 때)
infographicData: {
  "layout": "terminal",
  "title": "명령프롬프트",
  "lines": [{ "text": "명령어", "type": "input" }, { "text": "결과", "type": "output" }]
}

### alertModal (에러, 경고, 긴급 알림, 중요한 알림창이 뜨는 연출)
infographicData: {
  "layout": "alertModal",
  "title": "경고 제목",
  "message": "경고 내용",
  "type": "error"
}

### iMessage (두 사람의 문자 메시지 대화나 메신저 내역을 보여줄 때)
infographicData: {
  "layout": "iMessage",
  "contact": "상대방 이름",
  "messages": [{ "text": "안녕", "sender": "them" }, { "text": "응", "sender": "me" }]
}

### stickyNotes (포스트잇 여러 개가 붙어있는 형태의 메모/아이디어 나열)
infographicData: {
  "layout": "stickyNotes",
  "title": "메모 제목",
  "notes": [{ "text": "메모 내용", "color": "#fef08a" }]
}

### newsCard (뉴욕타임즈 스타일 뉴스 기사 + Vox 스타일 형광펜 하이라이트 — 보도, 속보, 기사, 언론 보도)
infographicData: {
  "layout": "newsCard",
  "headline": "뉴스 헤드라인 (40자 이내, 임팩트 있게)",
  "summary": "뉴스 본문 요약 (1~2문장)",
  "source": "출처 이름 (예: Reuters, 연합뉴스)",
  "date": "보도일",
  "highlightWords": ["핵심키워드1", "핵심키워드2"] // headline이나 summary에서 형광펜으로 강조할 단어 2~4개
}

### featureCards (아이콘이 포함된 3개의 카드로 핵심 특징/기능을 나열)
infographicData: {
  "layout": "featureCards",
  "title": "특징 제목",
  "cards": [{ "icon": "🚀", "title": "카드 제목", "description": "카드 설명" }]
}

### gauge (게이지/속도계 형태로 현재 상태나 위험도를 나타낼 때)
infographicData: {
  "layout": "gauge",
  "title": "게이지 제목",
  "value": 75,
  "maxValue": 100,
  "label": "라벨"
}

### tableCompare (스펙, 요금제 등 표 형태로 여러 항목을 비교할 때)
infographicData: {
  "layout": "tableCompare",
  "title": "표 제목",
  "headers": ["A", "B"],
  "rows": [{ "label": "항목", "values": ["O", "X"] }]
}

### milestone (현재 어디까지 왔는지 단계별 진행 상황이나 여정을 보여줄 때)
infographicData: {
  "layout": "milestone",
  "title": "여정 제목",
  "current": 1,
  "milestones": [{ "label": "1단계" }, { "label": "2단계" }]
}

### mapPin (지도 위의 특정 국가, 도시, 장소, 위치를 나타낼 때)
infographicData: {
  "layout": "mapPin",
  "location": "장소/국가 이름",
  "address": "세부 주소 (선택)",
  "coordinates": { "lat": (실제 위도 숫자), "lng": (실제 경도 숫자) }
}
예: 뉴질랜드 오클랜드 → { "lat": -36.8485, "lng": 174.7633 }, 파리 → { "lat": 48.8566, "lng": 2.3522 }

### routeMap (출발지에서 도착지까지의 경로, 이동선, 여행, 경유지를 표시할 때)
infographicData: {
  "layout": "routeMap",
  "from": "출발지",
  "to": "도착지",
  "distance": "거리/시간 (선택)",
  "duration": "소요시간 (선택)",
  "stops": ["경유지1", "경유지2"],
  "routeCoordinates": [
    { "lat": (출발지 실제 위도), "lng": (출발지 실제 경도) },
    { "lat": (도착지 실제 위도), "lng": (도착지 실제 경도) }
  ]
}
예: 런던→파리 → [{ "lat": 51.5074, "lng": -0.1278 }, { "lat": 48.8566, "lng": 2.3522 }]

### locationList (여러 장소, 관광지, 지역들의 목록이나 랭킹을 나열할 때)
infographicData: {
  "layout": "locationList",
  "title": "목록 제목",
  "locations": [{ "name": "장소 이름", "distance": "거리", "rating": 4.5, "type": "분류" }]
}

### zoomMap (세계지도에서 특정 국가/도시로 줌인하며 국기와 국가명 표시)
infographicData: {
  "layout": "zoomMap",
  "country": "국가명",
  "flag": "해당 국기 이모지",
  "coordinates": { "lat": (실제 위도 숫자), "lng": (실제 경도 숫자) },
  "highlightColor": "#00ff88",
  "description": "추가 설명 (선택)"
}
예: 뉴질랜드 → { "country": "뉴질랜드", "flag": "🇳🇿", "coordinates": { "lat": -41.2866, "lng": 174.7756 }, "description": "수도: 웰링턴" }
예: 브라질 → { "country": "브라질", "flag": "🇧🇷", "coordinates": { "lat": -15.7975, "lng": -47.8919 }, "description": "수도: 브라질리아" }

### panMap (출발지에서 도착지로 카메라가 3단계로 이동: 줌인→팬 이동→도착지 표시)
infographicData: {
  "layout": "panMap",
  "from": "출발지명",
  "to": "도착지명",
  "fromCoordinates": { "lat": (출발지 실제 위도), "lng": (출발지 실제 경도) },
  "toCoordinates": { "lat": (도착지 실제 위도), "lng": (도착지 실제 경도) },
  "description": "추가 설명 (선택)"
}
예: 뉴욕→LA → fromCoordinates: { "lat": 40.7128, "lng": -74.0060 }, toCoordinates: { "lat": 34.0522, "lng": -118.2437 }

### flightPath (곡선 비행 경로 위로 비행기가 이동하는 애니메이션 + 거리/시간 정보)
infographicData: {
  "layout": "flightPath",
  "from": "출발 공항/도시",
  "to": "도착 공항/도시",
  "fromCoordinates": { "lat": (출발지 실제 위도), "lng": (출발지 실제 경도) },
  "toCoordinates": { "lat": (도착지 실제 위도), "lng": (도착지 실제 경도) },
  "distance": "거리",
  "duration": "소요시간"
}
예: 시드니→도쿄 → fromCoordinates: { "lat": -33.8688, "lng": 151.2093 }, toCoordinates: { "lat": 35.6762, "lng": 139.6503 }

### pulseMap (특정 위치에서 펄스 링이 퍼져나가는 애니메이션 - 진원지/핫스팟/발원지 강조)
infographicData: {
  "layout": "pulseMap",
  "location": "위치명",
  "coordinates": { "lat": (실제 위도 숫자), "lng": (실제 경도 숫자) },
  "highlightColor": "#ff4444",
  "description": "설명 (선택)"
}
예: 우한 → { "lat": 30.5928, "lng": 114.3055 }, 체르노빌 → { "lat": 51.3890, "lng": 30.0992 }

⚠️ **지도 좌표 절대 규칙 (매우 중요!)**:
- 좌표(lat, lng)는 반드시 **대본에 언급된 실제 장소의 위도/경도**를 사용하세요!
- 위의 예시 좌표를 그대로 복사하지 마세요! 대본 내용에 맞는 정확한 좌표를 넣어야 합니다.
- 예: 대본이 "뉴질랜드"를 언급하면 → lat: -41.29, lng: 174.78 (웰링턴) 또는 lat: -36.85, lng: 174.76 (오클랜드)
- 예: 대본이 "일본 도쿄"를 언급하면 → lat: 35.68, lng: 139.65
- 예: 대본이 "미국 뉴욕"을 언급하면 → lat: 40.71, lng: -74.01
- 한국이 언급되지 않았는데 서울 좌표(37.57, 126.98)를 넣으면 **절대 안 됩니다!**

### pixelCharacter (레트로 감성/게임/픽셀/도트 캐릭터가 등장해서 무언가 말하거나 감정을 표현할 때)
infographicData: {
  "layout": "pixelCharacter",
  "character": "person", // "robot", "alien", "cat", "dog", "person", "monster", "custom" 중 선택
  "expression": "happy", // "happy", "sad", "angry", "surprised", "neutral" 중 선택
  "color": "#e53935",
  "label": "캐릭터 이름/역할",
  "speech": "대사나 하고 싶은 말"
}

### avatarSpeech (아바타 캐릭터가 등장하여 말풍선으로 인터뷰, 대사, 질문 전달할 때)
infographicData: {
  "layout": "avatarSpeech",
  "avatar": "👨‍💼", // 이모지나 이모티콘 사용
  "name": "인물 이름/직함",
  "speech": "대화/발언 내용",
  "position": "left" // "left" 또는 "right"
}

### emojiScene (여러 가지 이모지들이 팝업되며 복잡한 감정이나 상황을 은유할 때)
infographicData: {
  "layout": "emojiScene",
  "title": "상황/감정 제목",
  "emojis": [{ "emoji": "😭", "size": "lg", "position": { "x": 0, "y": 0 } }, { "emoji": "😡", "size": "md", "position": { "x": -100, "y": 50 } }]
}

### characterCompare (두 명의 캐릭터나 인물을 양쪽에 두고 행동/반응/특징을 비교할 때)
infographicData: {
  "layout": "characterCompare",
  "title": "비교 주제",
  "before": { "label": "캐릭터 A", "description": "A의 행동/반응" },
  "after": { "label": "캐릭터 B", "description": "B의 행동/반응" }
}

## ★ 이미지 프롬프트 규칙 (매우 중요 — 반드시 초상세하게)

사용자가 레퍼런스 이미지(화풍)를 별도로 넣습니다. 레퍼런스는 화풍만 참고하므로,
프롬프트에서 장면 내용(배경/인물/동작/소품/조명/앵글)을 극도로 구체적으로 묘사해야 합니다.
프롬프트가 모호하면 레퍼런스 이미지의 내용까지 그대로 복사됩니다!

### ★★★ 인물 수 — 대본 내용과 장면 연출에 맞게 자연스럽게 결정 ★★★

장면마다 적절한 인물 수가 다릅니다. 대본의 맥락을 읽고 자연스럽게 판단하세요:

- **인물 0명 (환경/사물 중심)**: 통계, 건물 외관, 풍경, 추상 개념, 음식 클로즈업, 물건/사물 중심 장면
- **인물 1명**: 개인 경험, 혼자 하는 행동, 감정 독백, 1인칭 시점 장면
- **인물 2명**: 대화, 비교, 갈등, 거래, 커플 장면
- **인물 3~5명**: 소규모 모임, 회의, 가족, 친구 그룹
- **인물 다수 (6명+)**: "사람들이", "직장인들", "시민들" 등 복수형 주어가 있거나, 군중/사회현상을 다루는 장면

#### 배경 인물 (선택적 — 장면에 어울릴 때만):
공공장소(식당, 거리, 사무실 등)에서 주인공만 덩그러니 있으면 어색한 경우에만 배경 인물을 추가하세요.
하지만 모든 장면에 억지로 넣지 마세요! 조용한 공간, 밤, 혼자 있는 상황에선 배경 인물이 없는 게 자연스럽습니다.
- 붐비는 식당 장면 → 배경에 다른 손님 1~2명 정도
- 한적한 새벽 거리 → 배경 인물 불필요
- 사무실 장면 → 맥락에 따라 동료 있을 수도, 혼자 야근 중일 수도
- 집/방 안 → 보통 인물 불필요

${isGroundedStyle ? `### ★★★ 자연스럽고 생활감 있는 연출 — 항상 적용 ★★★
사용자의 스타일이 일상적/현실적이므로, 과장/판타지 연출 대신 자연스러운 연출을 사용하세요:
- **자연스러운 표정**: 미소, 놀란 눈, 생각하는 표정, 걱정스러운 얼굴 등 일상 수준의 감정
- **일상적 포즈**: 걷기, 앉아서 대화하기, 무언가를 보기, 요리하기, 일하기 등 현실적 행동
- **자연스러운 앵글**: 아이레벨(눈높이), 살짝 위에서, 미디엄 샷 등 편안한 구도
- **현실적 환경**: 실제 공간(집, 카페, 거리, 사무실), 자연스러운 소품, 현실적 배치
- **부드러운 조명**: 자연광, 카페 조명, 저녁 노을, 따뜻한 실내등 — 네온/스포트라이트 금지
- **감정 표현**: 자연스러운 몸짓과 표정으로 — 극적 과장 금지
⚠️ 절대 금지: 거대한 화살표, 폭발, 물건이 날아오는 구도, 네온, SF/판타지 요소, 비현실적 스케일` : `### ★★★ 역동적이고 과장된 연출 — 항상 적용 ★★★
정적인 "캐릭터가 앉아있다" 같은 연출 절대 금지. 모든 장면에 동적 요소를 넣으세요:
- **과장된 리액션**: 놀라서 의자에서 뒤로 넘어지기, 충격받아 커피를 쏟기, 기뻐서 점프하기
- **역동적 포즈**: 달리기, 뛰어오르기, 손가락으로 가리키기, 주먹 쥐기, 팔 벌리기
- **드라마틱 앵글**: 로우앵글(아래에서 위), 버드아이뷰(위에서 아래), 더치앵글(기울어진), 초광각
- **과장된 원근법**: 물건이 카메라쪽으로 날아오는 구도, 거대하게 보이는 물체, 미니어처 느낌
- **동적 환경**: 바람에 종이가 날리기, 물건이 쏟아지기, 빛줄기가 쏟아지기, 먼지 파티클
- **감정 극대화**: 절망하면 무릎 꿇기, 분노하면 테이블 치기, 성공하면 트로피 들기`}

### 프롬프트 필수 구성요소 (7가지 모두 포함):
1. **배경/장소** (Setting): 구체적 공간, 시간대, 날씨 (예: "a dimly lit apartment living room at 2am", "crowded subway platform during morning rush hour")
2. **인물** (Subject): ⚠️ **절대 사실적/구체적 인종/외모를 쓰지 마세요!** "a character", "two characters", "a group of characters" 등 중립 표현만. "Korean man", "young woman" 등 금지. 인물이 필요 없는 장면이면 인물을 넣지 마세요!
3. **인물 수 근거** (Count): 대본의 주어/맥락에서 인물 수를 결정
4. **동작/포즈** (Action): 자연스럽고 일상적인 행동 (예: "walking calmly", "pointing at a map", "looking at the camera")
5. **소품/디테일** (Props): 장면과 관련된 자연스러운 물건들 (예: "a map of Japan", "a textbook", "a coffee cup")
6. **조명/분위기** (Lighting/Mood): 자연스럽고 부드러운 조명 (예: "soft natural light", "bright daylight", "warm room lighting")
7. **카메라 앵글** (Camera): ⚠️ **기본은 미디엄 샷~와이드 샷!** 클로즈업/익스트림 클로즈업은 특별한 감정 장면에서만. 인물 전신이 보이고 배경이 충분히 보이는 구도를 기본으로. (예: "wide shot showing full body and environment", "medium shot from waist up with background visible", "establishing wide shot")

### 프롬프트 길이: 최소 60단어, 최대 120단어

### ★★★ 구도/줌 레벨 — 너무 줌인하지 마세요! ★★★
**이미지가 16:9 와이드스크린 영상에 사용됩니다.** 대부분의 장면에서:
- **기본값 = 미디엄 와이드 샷**: 인물의 전신 + 주변 환경이 충분히 보이도록
- **와이드/풀샷 (60% 이상)**: 배경과 공간감을 살려서 — 인물이 환경 속에 있는 느낌
- **미디엄 샷 (30%)**: 허리 위 + 배경 일부 — 감정 표현이 중요한 장면
- **클로즈업 (10% 이하)**: 극적 감정 포인트에서만 드물게 사용
- 절대 매 장면을 클로즈업/익스트림 클로즈업으로 하지 마세요!
- 프롬프트에 반드시 "wide shot", "full body visible", "medium wide" 등 줌 레벨을 명시하세요

${isGroundedStyle ? `### 좋은 예시 (일상적/그라운디드 스타일):
- 대본 "매달 월급 들어오면 카드값 빠지고 월세 빠지고" → (혼자 있는 장면 — 인물 1명)
  "Medium wide shot of a small studio apartment in the evening. A character sitting at a desk, head resting on one hand, looking tired at a laptop screen. A few bills and a calculator on the desk. Warm desk lamp light, cozy but slightly melancholic atmosphere. Cup of coffee going cold beside the laptop. Simple clean room with a bed and small kitchen visible. Soft warm indoor lighting, high quality, no text, no watermark"

- 대본 "요즘 짜장면 가격이 미쳤다" → (식당 장면 — 주인공 1명 + 배경에 다른 손님)
  "Medium shot inside a cozy Chinese restaurant. A character looking at a receipt with a surprised expression, holding chopsticks. A bowl of jajangmyeon on the table with steam rising. Red-and-white checkered tablecloth. In the background, another diner eating at a nearby table. Warm overhead restaurant lights, casual everyday atmosphere, soft lighting, high quality, no text, no watermark"

- 대본 "직장인들 사이에서 난리가 났다" → (복수 주어 — 여러 인물)
  "Wide shot of an open-plan office. Several characters gathered around a computer screen with animated expressions — some pointing, some with hands on their cheeks in surprise. Coffee cups and documents on desks. Bright fluorescent office lighting, everyday modern workspace atmosphere, clean composition, high quality, no text, no watermark"

- 대본 "서울 아파트 가격이 14배 올랐다" → (환경 중심 — 인물 불필요)
  "Wide panoramic view of a dense urban cityscape with many apartment buildings at sunset. Rows of high-rise residential towers stretching into the distance. Warm golden hour light casting long shadows. A few trees and parks between buildings. Clear sky with soft clouds. Calm, documentary-style wide establishing shot, soft warm lighting, high quality, no text, no watermark"` : `### 좋은 예시:
- 대본 "매달 월급 들어오면 카드값 빠지고 월세 빠지고" → (혼자 있는 장면 — 인물 1명, 배경 인물 불필요)
  "Wide shot of a cramped one-room apartment at night. A character leaning far back in an office chair, arms thrown up, bills and coins scattering mid-air. A laptop screen glows blue with declining numbers. Ramen cups and receipts litter the floor. The entire room visible — bed, desk, mini fridge. Outside the window, city skyline with lit apartment windows. Warm desk lamp casting long shadows, cinematic lighting, high quality, no text, no watermark"

- 대본 "요즘 짜장면 가격이 미쳤다" → (식당 장면 — 주인공 1명 + 배경에 다른 손님 약간)
  "Wide shot of a Chinese restaurant interior. A character stares in shock at a receipt, mouth agape, chopsticks frozen mid-air. At the next table, a couple of other diners eating noodles. Steam rising from bowls on the table. Red lantern decorations hanging from ceiling. A menu board on the wall with prices. Warm golden overhead lights, steam filling the air, cinematic lighting, high quality, no text, no watermark"

- 대본 "직장인들 사이에서 난리가 났다" → (복수 주어 — 여러 인물 필수)
  "Wide establishing shot of a chaotic open-plan office. Six characters in various dramatic poses — two arguing face-to-face, one standing on a desk pointing at a screen, another running with papers flying, two more jumping from chairs in shock. Rows of desks, scattered papers, overturned coffee cups. Overhead fluorescent lights, cinematic lighting, high quality, no text, no watermark"

- 대본 "서울 아파트 가격이 14배 올랐다" → (환경 중심 — 인물 불필요)
  "Extreme wide aerial panorama of endless apartment tower blocks stretching to the horizon at golden hour. Massive buildings fill the frame. Giant red upward arrows burst from rooftops. A comically oversized price tag hangs from the nearest building. Warm sunset rays pierce through gaps creating god rays. Distant mountains through haze. Camera far above showing vast urban sprawl. Orange-purple sky with dramatic clouds, cinematic lighting, high quality, no text, no watermark"`}

### 절대 금지:
- ⚠️ 사실적 인물 묘사 (Korean man, young woman, businessman 등) — "character", "figure"로만 표현
${isGroundedStyle ? `- ⚠️ 판타지/SF/초현실적 요소 — 거대 화살표, 폭발, 네온 글로우, 마법 효과, 비현실적 스케일 등 절대 금지
- ⚠️ 과장된 연출 — 물건이 날아오는 구도, 극단적 앵글, 비현실적 포즈 금지` : `- ⚠️ 정적이고 지루한 포즈 — "sitting calmly", "standing still", "looking at phone" 같은 평범한 연출 금지`}
- ⚠️ 매 장면 클로즈업/줌인 — 기본은 와이드~미디엄 샷! 환경이 보여야 함
- ⚠️ 매 장면에 억지로 사람 많이 넣기 — 대본 내용에 맞는 자연스러운 인물 수를 판단하세요
- 추상적/장식적 이미지 (주사위, 물방울, 그래프 아이콘 등)
- 1줄짜리 짧은 프롬프트 ("photo of apartments" ← 이러면 안 됨)
- 텍스트, 글자, 워터마크
- "realistic", "photorealistic", "photo" 같은 사실적 스타일 지정어

### 장면 타입별 참고:
- **image (이미지 씬)**: 배경이 전체 화면을 채우므로 특히 풍부한 디테일 + 역동적 연출 필수
- **quote**: 어두운 블러 처리되므로 선명한 주제 이미지 + 극적 앵글
- **bottomCaption**: 하단에 텍스트가 올라오므로 시각 초점을 상단에 배치 + 동적 구도
- **quote/bottomCaption 외 모든 인포그래픽/레이아웃(comparison, bigStat, list, lineChart, cardGrid, profileCard, orchestra, timeline, checklist, comparisonDark, bigStatDark, circularProgress, barChart, vsCompare, twitterPost, beforeAfter, progressBars, testimonial, browserMockup, terminal, alertModal, iMessage, stickyNotes, newsCard, featureCards, gauge, tableCompare, milestone)**: 텍스트/차트 아래 깔리므로 절대 복잡하지 않은 은은한 배경 (이 타입들은 정적 연출 허용)

프롬프트 끝에 항상 추가: "high quality, no text, no watermark"

## 데이터 규칙
1. quote/bottomCaption: displayText는 대본 그대로가 아닌 핵심만 25~50자로 가공
2. 인포그래픽(위에서 정의한 모든 레이아웃 종류): 대본에서 데이터를 정확히 추출
3. 대본에 구체적 숫자가 없으면 합리적으로 추정하지 말고 quote로 전환
4. lineChart는 최소 3개 이상의 데이터 포인트가 필요
5. 장면 타입이 "image"인 경우 motionStyle/displayText/highlightKeywords/infographicData는 모두 기본값 처리하되, imagePrompt는 반드시 초상세하게 생성

⚠️ 매우 중요: 매 장면마다 'quote', 'bottomCaption', 'bigStat', 'comparison'만 반복해서 사용하지 마세요!
대본의 맥락에 맞춰서 'barChart', 'circularProgress', 'timeline', 'twitterPost', 'orchestra', 'profileCard', 'vsCompare', 'cardGrid', 'checklist', 'browserMockup', 'terminal', 'alertModal', 'newsCard', 'featureCards', 'testimonial', 'stickyNotes' 등 새롭게 추가된 다양한 레이아웃들을 적극적으로 섞어서 활용해야 합니다.

⚠️ **절대 금지사항 (매우 중요)**:
1. **초반 도배 금지**: 1번 씬부터 연속으로 'quote'나 'bottomCaption'만 주구장창 늘어놓지 마세요! 첫 씬부터 다채로운 레이아웃을 시도하세요.
2. **연속된 모션 반복 금지**: 바로 앞 씬에서 고른 레이아웃을 다음 씬에서 또 고르지 마세요. (예: quote 연달아 쓰기 금지)
3. **모션 편식 금지**: 수치(숫자)가 나오더라도 무조건 bigStat만 쓰지 말고, barChart, circularProgress, progressBars, gauge 등을 섞어서 쓰세요.
4. A와 B의 비교/대조가 나오더라도 무조건 comparison만 쓰지 말고, tableCompare, vsCompare, beforeAfter 등을 다채롭게 번갈아가며 사용하세요. 전체 영상이 지루하지 않게 징검다리처럼 다채로운 모션 스타일을 분산 배치하세요.

${scenesDesc}

JSON 배열로 응답 (코드블록 없이):
[{
  "motionStyle": "quote",
  "displayText": "...",
  "highlightKeywords": ["..."],
  "sourceLabel": "직함\\n이름",
  "infographicData": null,
  "imagePrompt": "Medium shot of a ..."
}, ...]

infographicData가 없는 스타일은 null로, displayText/sourceLabel이 없으면 빈 문자열로.`;

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
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ error: `Claude API: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse", raw: text }, { status: 500 });
    }

    const results = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("analyze-scenes error:", err);
    return NextResponse.json({ error: err.message ?? "Unknown" }, { status: 500 });
  }
}
