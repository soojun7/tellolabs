/* ── 인포그래픽 구조화 데이터 ── */

export interface ComparisonData {
  layout: "comparison";
  title: string;
  leftCard: { label: string; color: string; items: string[]; summary: string };
  rightCard: { label: string; color: string; items: string[]; summary: string };
  footer?: string;
}

export interface BigStatData {
  layout: "bigStat";
  category?: string;
  number: string;
  unit?: string;
  description: string;
}

export interface ListData {
  layout: "list";
  title: string;
  items: { label: string; value?: string }[];
}

export interface LineChartData {
  layout: "lineChart";
  title: string;
  yMax: number;
  yLabel?: string;
  points: { x: string; y: number }[];
  annotations?: { xIndex: number; label: string }[];
  lineColor?: string;
}

/* ── Dark Mint Theme Layouts ── */

export interface CardGridData {
  layout: "cardGrid";
  title: string;
  cards: {
    number?: number;
    title: string;
    description?: string;
    icon?: string;
  }[];
  columns?: 2 | 3 | 4 | 5;
}

export interface ProfileCardData {
  layout: "profileCard";
  name: string;
  initials?: string;
  role: string;
  company?: string;
  quote?: string;
  stats?: { label: string; value: string }[];
}

export interface OrchestraData {
  layout: "orchestra";
  centerLabel: string;
  centerSubLabel?: string;
  nodes: { label: string; icon?: string }[];
}

export interface TimelineData {
  layout: "timeline";
  title?: string;
  steps: {
    number: number;
    title: string;
    description?: string;
    highlight?: boolean;
  }[];
}

export interface ChecklistData {
  layout: "checklist";
  title: string;
  items: { text: string; checked?: boolean }[];
}

export interface ComparisonDarkData {
  layout: "comparisonDark";
  title?: string;
  left: {
    icon?: string;
    title: string;
    items: string[];
    summary?: string;
  };
  right: {
    icon?: string;
    title: string;
    items: string[];
    summary?: string;
    highlight?: boolean;
  };
}

export interface BigStatDarkData {
  layout: "bigStatDark";
  category?: string;
  number: string;
  unit?: string;
  description: string;
  progressValue?: number; // 0-100 for progress bar
}

export interface CircularProgressData {
  layout: "circularProgress";
  title?: string;
  percentage: number;
  label?: string;
  subtitle?: string;
}

export interface BarChartData {
  layout: "barChart";
  title?: string;
  bars: { label: string; value: number; maxValue?: number; highlight?: boolean }[];
}

export interface VsCompareData {
  layout: "vsCompare";
  title?: string;
  left: { icon: string; title: string; subtitle?: string };
  right: { icon: string; title: string; subtitle?: string; highlight?: boolean };
}

export interface TwitterPostData {
  layout: "twitterPost";
  username: string;
  handle: string;
  verified?: boolean;
  content: string;
  media?: { type: string; content?: string };
  time?: string;
  date?: string;
  views?: string;
  replies?: string;
  retweets?: string;
  likes?: string;
  bookmarks?: string;
}

export interface MapPinData {
  layout: "mapPin";
  location: string;
  address?: string;
  coordinates: { lat: number; lng: number };
}

export interface RouteMapData {
  layout: "routeMap";
  from: string;
  to: string;
  distance?: string;
  duration?: string;
  stops?: string[];
  routeCoordinates: { lat: number; lng: number }[];
}

export interface LocationListData {
  layout: "locationList";
  title?: string;
  locations: { name: string; distance?: string; rating?: number; type?: string }[];
}

export interface ZoomMapData {
  layout: "zoomMap";
  country: string;
  flag?: string;
  coordinates: { lat: number; lng: number };
  highlightColor?: string;
  description?: string;
}

export interface PanMapData {
  layout: "panMap";
  from: string;
  to: string;
  fromCoordinates: { lat: number; lng: number };
  toCoordinates: { lat: number; lng: number };
  description?: string;
}

export interface FlightPathData {
  layout: "flightPath";
  from: string;
  to: string;
  fromCoordinates: { lat: number; lng: number };
  toCoordinates: { lat: number; lng: number };
  distance?: string;
  duration?: string;
}

export interface PulseMapData {
  layout: "pulseMap";
  location: string;
  coordinates: { lat: number; lng: number };
  highlightColor?: string;
  description?: string;
}

export interface PixelCharacterData {
  layout: "pixelCharacter";
  character: "robot" | "alien" | "cat" | "dog" | "person" | "monster" | "custom";
  expression?: "happy" | "sad" | "angry" | "surprised" | "neutral";
  color?: string;
  label?: string;
  speech?: string;
}

export interface MascotData {
  layout: "mascot";
  type: "blob" | "robot" | "animal" | "geometric";
  color?: string;
  expression?: string;
  message?: string;
}

export interface EmojiSceneData {
  layout: "emojiScene";
  emojis: { emoji: string; size?: "sm" | "md" | "lg" | "xl"; position?: { x: number; y: number } }[];
  title?: string;
}

export interface AvatarSpeechData {
  layout: "avatarSpeech";
  avatar: string;
  name?: string;
  speech: string;
  position?: "left" | "right";
}

export interface CharacterCompareData {
  layout: "characterCompare";
  title?: string;
  before: { label: string; description?: string };
  after: { label: string; description?: string };
}

export interface BeforeAfterData {
  layout: "beforeAfter";
  title?: string;
  before: { title: string; items: string[]; icon?: string };
  after: { title: string; items: string[]; icon?: string };
}

export interface ProgressBarsData {
  layout: "progressBars";
  title?: string;
  items: { label: string; value: number; color?: string }[];
}

export interface GaugeData {
  layout: "gauge";
  title?: string;
  value: number;
  maxValue: number;
  label?: string;
  zones?: { color: string; from: number; to: number }[];
}

export interface BrowserMockupData {
  layout: "browserMockup";
  url?: string;
  title?: string;
  subtitle?: string;
}

export interface CodeBlockData {
  layout: "codeBlock";
  title?: string;
  code: string;
  language?: string;
  highlights?: number[];
}

export interface TerminalData {
  layout: "terminal";
  title?: string;
  lines: { type: "input" | "output" | "error"; text: string }[];
}

export interface AlertModalData {
  layout: "alertModal";
  icon?: string;
  title: string;
  subtitle?: string;
  message?: string;
  type?: "info" | "warning" | "success" | "error";
}

export interface TestimonialData {
  layout: "testimonial";
  quote: string;
  author: { name: string; initials?: string; role?: string; company?: string };
  rating?: number;
}

export interface IMessageData {
  layout: "iMessage";
  contact: string;
  messages: { text: string; sender: "me" | "them" }[];
}

export interface NewsCardData {
  layout: "newsCard";
  headline: string;
  summary: string;
  source: string;
  date: string;
  highlightWords?: string[];
}

export interface StickyNotesData {
  layout: "stickyNotes";
  title?: string;
  notes: { text: string; color?: string }[];
}

export interface FeatureCardsData {
  layout: "featureCards";
  title?: string;
  cards: { icon: string; title: string; description?: string; badge?: string }[];
}

export interface MilestoneData {
  layout: "milestone";
  title?: string;
  current: number;
  milestones: { label: string; completed?: boolean }[];
}

export interface TableCompareData {
  layout: "tableCompare";
  title?: string;
  headers: string[];
  rows: { label: string; values: (string | boolean)[] }[];
}

export type InfographicData =
  | ComparisonData
  | BigStatData
  | ListData
  | LineChartData
  | CardGridData
  | ProfileCardData
  | OrchestraData
  | TimelineData
  | ChecklistData
  | ComparisonDarkData
  | BigStatDarkData
  | CircularProgressData
  | BarChartData
  | VsCompareData
  | TwitterPostData
  | MapPinData
  | RouteMapData
  | LocationListData
  | PixelCharacterData
  | MascotData
  | EmojiSceneData
  | AvatarSpeechData
  | CharacterCompareData
  | BeforeAfterData
  | ProgressBarsData
  | IMessageData
  | TerminalData
  | BrowserMockupData
  | TestimonialData
  | AlertModalData
  | NewsCardData
  | StickyNotesData
  | FeatureCardsData
  | GaugeData
  | TableCompareData
  | MilestoneData
  | ZoomMapData
  | PanMapData
  | FlightPathData
  | PulseMapData;

/* ── 모션 스타일 ── */

export const MOTION_STYLES = [
  { id: "quote", label: "인용문", desc: "어두운 블러 배경 + 중앙 텍스트", icon: "❝" },
  { id: "bottomCaption", label: "하단 캡션", desc: "선명한 이미지 + 하단 텍스트", icon: "▁" },
  { id: "comparison", label: "비교", desc: "좌/우 비교 카드", icon: "⚖" },
  { id: "bigStat", label: "큰 숫자", desc: "핵심 숫자 강조", icon: "🔢" },
  { id: "list", label: "목록", desc: "항목 나열", icon: "☰" },
  { id: "lineChart", label: "차트", desc: "추이 라인 그래프", icon: "📈" },
  { id: "cardGrid", label: "카드 그리드", desc: "번호가 매겨진 카드 그리드", icon: "▦" },
  { id: "profileCard", label: "프로필 카드", desc: "인물 프로필 카드", icon: "👤" },
  { id: "orchestra", label: "오케스트라", desc: "중앙 + 주변 노드 다이어그램", icon: "◉" },
  { id: "timeline", label: "타임라인", desc: "단계별 프로세스", icon: "⏱" },
  { id: "checklist", label: "체크리스트", desc: "체크 항목 목록", icon: "✓" },
  { id: "comparisonDark", label: "비교 (다크)", desc: "다크 테마 비교", icon: "⚖" },
  { id: "bigStatDark", label: "큰 숫자 (다크)", desc: "다크 테마 숫자 강조", icon: "🔢" },
  { id: "circularProgress", label: "원형 차트", desc: "원형 진행률/비율", icon: "⭕" },
  { id: "barChart", label: "바 차트", desc: "막대 그래프", icon: "📊" },
  { id: "vsCompare", label: "대결 비교", desc: "대결 구도 비교", icon: "⚔️" },
  { id: "twitterPost", label: "트위터", desc: "트위터 포스트 느낌", icon: "🐦" },
  { id: "beforeAfter", label: "비포/애프터", desc: "전후 비교", icon: "🔄" },
  { id: "progressBars", label: "가로 바 차트", desc: "가로 진행률/비율", icon: "📈" },
  { id: "testimonial", label: "인용/증언", desc: "인물 프로필과 인용구", icon: "💬" },
  { id: "browserMockup", label: "웹 브라우저", desc: "웹사이트 목업", icon: "🌐" },
  { id: "terminal", label: "터미널", desc: "코딩/터미널 창", icon: "💻" },
  { id: "alertModal", label: "알림창", desc: "중앙 팝업 알림", icon: "🔔" },
  { id: "iMessage", label: "메시지", desc: "채팅/메시지 UI", icon: "💬" },
  { id: "stickyNotes", label: "포스트잇", desc: "그리드형 메모", icon: "📝" },
  { id: "newsCard", label: "뉴스", desc: "뉴스 속보 디자인", icon: "📰" },
  { id: "featureCards", label: "특징 카드", desc: "아이콘이 포함된 카드들", icon: "✨" },
  { id: "gauge", label: "게이지", desc: "반원형 게이지 차트", icon: "🎛" },
  { id: "tableCompare", label: "표 비교", desc: "표 형태의 스펙 비교", icon: "📋" },
  { id: "milestone", label: "마일스톤", desc: "단계별 진행/타임라인", icon: "🚩" },
  { id: "mapPin", label: "지도 핀", desc: "지도 위 위치 표시", icon: "📍" },
  { id: "routeMap", label: "경로 지도", desc: "출발-도착 경로/경유지", icon: "🗺️" },
  { id: "locationList", label: "위치 목록", desc: "주요 장소/위치 리스트", icon: "📍" },
  { id: "zoomMap", label: "줌 지도", desc: "줌인하며 국가/도시 하이라이트", icon: "🔍" },
  { id: "panMap", label: "팬 지도", desc: "출발→도착 카메라 이동", icon: "🧭" },
  { id: "flightPath", label: "비행 경로", desc: "곡선 비행경로 + 비행기 애니메이션", icon: "✈️" },
  { id: "pulseMap", label: "펄스 지도", desc: "위치에서 펄스 링 확산 애니메이션", icon: "📡" },
  { id: "pixelCharacter", label: "픽셀 캐릭터", desc: "도트 감성 캐릭터 등장", icon: "👾" },
  { id: "avatarSpeech", label: "아바타 대화", desc: "말풍선과 함께 캐릭터 등장", icon: "🗣" },
  { id: "emojiScene", label: "이모지 씬", desc: "다양한 이모지 팝업", icon: "😀" },
] as const;

export type MotionStyleId = (typeof MOTION_STYLES)[number]["id"];

/* ── 장면 데이터 ── */

export type SceneType = "motion" | "image";

export interface SceneData {
  line: string;
  keywords: string[];
  backgroundImage: string;
  mainImage: string;
  mainImageSource: string;
  type: "meme" | "stock" | "stock-image" | "google";
  sceneType: SceneType;
  motionStyle: MotionStyleId;
  fontSize?: number;
  fontId?: string;
  highlightColor?: string;
  displayText?: string;
  subText?: string;
  sourceLabel?: string;
  narration?: string;
  audioUrl?: string;
  audioDuration?: number;
  zoom?: "in" | "out";
  infographicData?: InfographicData;
  subtitlePosition?: "bottom" | "center" | "top";
  subtitleX?: number;
  subtitleY?: number;
  subtitleSize?: number;
  subtitleFont?: string;
  subtitleColor?: string;
  subtitleBg?: "none" | "box" | "fullbar";
  subtitleStroke?: boolean;
  subtitleStrokeWidth?: number;
  fadeEnabled?: boolean;
  imagePrompt?: string;
  language?: string;
  videoClipUrl?: string;
  sfxUrl?: string;
  sfxVolume?: number;
}

export interface VideoProps {
  scenes: SceneData[];
  fps: number;
  sceneDurationFrames: number;
}

export function getSceneDurationFrames(scene: SceneData, fps: number, defaultDur: number): number {
  if (scene.audioDuration && scene.audioDuration > 0) {
    const MIN_FRAMES = Math.ceil(fps * 1.5);
    return Math.max(Math.ceil(scene.audioDuration * fps) + 15, MIN_FRAMES);
  }
  return defaultDur;
}

/* ── 상수 ── */

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;
export const SCENE_DURATION_SEC = 5;
export const SCENE_DURATION_FRAMES = SCENE_DURATION_SEC * VIDEO_FPS;
export const TRANSITION_FRAMES = 15;

/* ── 로컬 휴리스틱 폴백 ── */

export function recommendStyle(
  scene: Omit<SceneData, "motionStyle">,
): MotionStyleId {
  const line = scene.line;

  if (/@|트윗|말했다|게시글|네티즌|반응|트위터|SNS/.test(line)) return "twitterPost";
  if (/대결|싸움|맞대결|경쟁/.test(line)) return "vsCompare";
  if (/(비율|퍼센트|점유율|퍼센티지).*\d+%/.test(line)) return "circularProgress";
  if (/막대|비교|차이/.test(line) && /\d+/.test(line)) return "barChart";
  if (/특징|장점|요인|종류/.test(line)) return "cardGrid";
  if (/전문가|대표|교수|의견|인물/.test(line)) return "profileCard";
  if (/과정|역사|순서|이후|년도|단계/.test(line)) return "timeline";
  if (/조건|필수|확인|주의/.test(line)) return "checklist";
  if (/중심|연관|파생|네트워크/.test(line)) return "orchestra";
  if (/전후|이전|이후|해결|문제점/.test(line)) return "beforeAfter";
  if (/속보|뉴스|충격|발표/.test(line)) return "newsCard";
  if (/경고|에러|실패|위험/.test(line)) return "alertModal";
  if (/웹사이트|검색|구글|인터넷/.test(line)) return "browserMockup";
  if (/코딩|해커|시스템|터미널|명령어/.test(line)) return "terminal";
  if (/문자|카톡|대화|채팅|메시지/.test(line)) return "iMessage";
  if (/표|스펙|기능|항목/.test(line)) return "tableCompare";
  if (/위험도|속도|게이지|달성률/.test(line)) return "gauge";
  if (/메모|포스트잇|아이디어|생각/.test(line)) return "stickyNotes";
  if (/마일스톤|여정|목표|도달/.test(line)) return "milestone";
  if (/위치|장소|어디에|지도|발견/.test(line)) return "mapPin";
  if (/경로|이동|출발|도착|거리|여행/.test(line)) return "routeMap";
  if (/목록|명소|핫플|가볼만한곳/.test(line)) return "locationList";
  if (/국가|나라|수도|영토|대륙|국기/.test(line)) return "zoomMap";
  if (/비행|항공|노선|직항|경유|운항/.test(line)) return "flightPath";
  if (/진원지|발원지|중심지|핫스팟|발생지|확산/.test(line)) return "pulseMap";
  if (/이동하|옮기|떠나|향하|도착하/.test(line)) return "panMap";
  if (/게임|픽셀|도트|캐릭터|옛날|레트로/.test(line)) return "pixelCharacter";
  if (/아바타|말했다|주장|인터뷰|대화|질문/.test(line)) return "avatarSpeech";
  if (/감정|기분|반응|이모지|표정/.test(line)) return "emojiScene";

  if (/반면|한편|대비|비해|vs|VS|~은.*~은/.test(line)) {
    const opts: MotionStyleId[] = ["comparison", "comparisonDark", "vsCompare", "tableCompare"];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  if (/추이|변화|추세|증감|하락세|상승세/.test(line) && /\d{4}년/.test(line))
    return "lineChart";
  if (/\d[\d,.]*\s*(?:조|억|만|천)?\s*(?:달러|원|명|%|배|위)/.test(line)) {
    const opts: MotionStyleId[] = ["bigStat", "bigStatDark", "circularProgress", "barChart", "gauge"];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  if (/첫째|둘째|셋째|①|②|③|1\)|2\)|3\)/.test(line)) return "list";
  if (line.length > 80) return "bottomCaption";

  const defaultOpts: MotionStyleId[] = [
    "quote", "quote", "quote", "bottomCaption", "bottomCaption",
    "cardGrid", "stickyNotes", "featureCards", "testimonial",
    "pixelCharacter", "avatarSpeech", "emojiScene"
  ];
  return defaultOpts[Math.floor(Math.random() * defaultOpts.length)];
}
