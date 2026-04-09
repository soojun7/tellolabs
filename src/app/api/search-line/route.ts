import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const PEXELS_KEY = process.env.PEXELS_API_KEY!;
const SUPERMEME_KEY = process.env.SUPERMEME_API_KEY!;
const SERPAPI_KEY = process.env.SERPAPI_API_KEY!;

interface SourceItem {
  id: string;
  type: "meme" | "stock" | "stock-image" | "google";
  title: string;
  thumbnail: string;
  source: string;
  sourceUrl?: string;
  duration?: string;
  tags: string[];
  original?: string;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  const line: string = body.line ?? "";
  const lineIndex: number = body.lineIndex ?? 0;

  if (!line.trim()) {
    return NextResponse.json(
      { line, lineIndex, keywords: [], items: [], errors: ["빈 줄입니다."] },
    );
  }

  const keywords = extractKeywords(line);
  const query = keywords.join(" ");

  if (!query) {
    return NextResponse.json({
      line, lineIndex, keywords: [], items: [],
      errors: ["키워드를 추출할 수 없습니다."],
    });
  }

  const pexelsQuery = await translateToEnglish(line);

  const results = await Promise.allSettled([
    fetchPexelsPhotos(pexelsQuery, 1),
    fetchPexelsVideos(pexelsQuery, 2),
    fetchMemes(line, 2),
    fetchGoogleImages(query, 1),
  ]);

  const items: SourceItem[] = [];
  const errors: string[] = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      items.push(...r.value);
    } else {
      errors.push(r.reason?.message ?? "Unknown error");
    }
  }

  return NextResponse.json({ line, lineIndex, keywords, items, errors });
}

function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    "이", "그", "저", "것", "수", "등", "때", "곳", "중", "더", "안", "못", "좀",
    "의", "를", "을", "에", "가", "는", "은", "로", "으로", "와", "과",
    "도", "만", "에서", "까지", "부터", "하고", "이나", "나", "요",
    "그리고", "하지만", "그래서", "그런데", "또한", "또", "근데",
    "있다", "없다", "하다", "되다", "이다", "합니다", "했습니다", "됐습니다",
    "입니다", "있습니다", "했어요", "있어요", "했죠", "있죠", "거든요",
    "보셔야", "아시는", "모르시는", "아니에요", "됐어요", "올랐어요",
    "벌었습니다", "뛰어버렸어요", "했거든요",
    "넣어둔", "넣으면", "알아보겠습니다", "보겠습니다", "하나였거든요",
    "이미", "지금", "오늘", "내일", "어제", "여기", "거기", "우리", "나는", "저는",
    "정말", "너무", "매우", "아주", "다시", "바로", "꼭", "잘", "많이", "가장",
    "전", "후", "다", "모두", "각", "별", "약", "총", "뭘", "왜", "어떻게",
    "원", "분", "년", "월", "일", "번", "개", "명",
    "사람", "사람들", "사람들이", "영상", "분", "배", "만에", "넘게", "하나만",
    "몇", "달치", "것들", "얘기", "말", "생각", "부분", "경우", "정도",
    "a", "the", "is", "are", "was", "were", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "it", "this", "that", "with", "from", "be", "have", "has", "had",
  ]);

  const isOnlyNumber = (w: string) => /^\d+$/.test(w);

  const raw = text
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const words = raw
    .map(stripParticles)
    .filter((w) => w.length > 1 && !stopwords.has(w) && !isOnlyNumber(w));

  const scored = new Map<string, number>();
  for (const w of words) {
    const base = scored.get(w) ?? 0;
    const isNounLike = /^[가-힣]{2,}$/.test(w) || /^[A-Z]/.test(w);
    scored.set(w, base + (isNounLike ? 2 : 1));
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([w]) => w);
}

function stripParticles(word: string): string {
  const longParticles = [
    "에서는", "으로는", "에서도", "으로도", "부터는", "이라는", "이었던",
    "였거든요", "이었거든요", "거든요", "이라고", "이랑은",
    "에서", "까지", "부터", "보다", "처럼", "만큼", "으로", "이라",
    "에게", "한테", "께서", "이랑",
  ];
  const shortParticles = [
    "는", "은", "이", "가", "를", "을", "의", "에", "로", "도", "만",
    "와", "과", "나", "란",
  ];

  for (const p of longParticles) {
    if (word.length > p.length + 1 && word.endsWith(p)) {
      return word.slice(0, -p.length);
    }
  }
  for (const p of shortParticles) {
    if (word.length >= p.length + 1 && word.endsWith(p)) {
      return word.slice(0, -p.length);
    }
  }
  return word;
}

async function translateToEnglish(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    const translated = data?.[0]?.map((s: any) => s[0]).join("") ?? text;
    return translated || text;
  } catch {
    return text;
  }
}

async function fetchPexelsPhotos(query: string, count: number): Promise<SourceItem[]> {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}`,
    { headers: { Authorization: PEXELS_KEY } },
  );
  if (!res.ok) throw new Error(`Pexels photos: ${res.status}`);
  const data = await res.json();
  return (data.photos ?? []).map((p: any) => ({
    id: `pexels-photo-${p.id}`,
    type: "stock-image" as const,
    title: p.alt || "Pexels Photo",
    thumbnail: p.src?.medium ?? p.src?.small,
    source: `Pexels · ${p.photographer ?? ""}`,
    sourceUrl: p.url,
    tags: [],
    original: p.src?.original,
  }));
}

async function fetchPexelsVideos(query: string, count: number): Promise<SourceItem[]> {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${count}`,
    { headers: { Authorization: PEXELS_KEY } },
  );
  if (!res.ok) throw new Error(`Pexels videos: ${res.status}`);
  const data = await res.json();
  return (data.videos ?? []).map((v: any) => ({
    id: `pexels-video-${v.id}`,
    type: "stock" as const,
    title: v.url?.split("/").pop()?.replace(/-/g, " ") ?? "Pexels Video",
    thumbnail: v.image,
    source: `Pexels · ${v.user?.name ?? ""}`,
    sourceUrl: v.url,
    duration: formatDuration(v.duration),
    tags: [],
  }));
}

async function fetchMemes(text: string, count: number): Promise<SourceItem[]> {
  const res = await fetch("https://app.supermeme.ai/api/v2/meme/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPERMEME_KEY}`,
    },
    body: JSON.stringify({ text, count: Math.min(count, 12), aspectRatio: "16:9" }),
  });
  if (!res.ok) throw new Error(`SuperMeme: ${res.status}`);
  const data = await res.json();
  const urls: string[] = data.memes ?? [];
  return urls.map((url, i) => ({
    id: `meme-${Date.now()}-${i}`,
    type: "meme" as const,
    title: text.slice(0, 60),
    thumbnail: url,
    source: "SuperMeme.ai",
    sourceUrl: url,
    tags: ["밈", "AI생성"],
  }));
}

async function fetchGoogleImages(query: string, count: number): Promise<SourceItem[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_images");
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(count));
  url.searchParams.set("hl", "ko");
  url.searchParams.set("gl", "kr");
  url.searchParams.set("api_key", SERPAPI_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SerpAPI: ${res.status}`);
  const data = await res.json();
  return (data.images_results ?? []).slice(0, count).map(
    (img: any, i: number) => ({
      id: `google-${Date.now()}-${i}`,
      type: "google" as const,
      title: img.title || "Google Image",
      thumbnail: img.thumbnail,
      source: `Google · ${img.source ?? ""}`,
      sourceUrl: img.link ?? img.original,
      tags: [],
      original: img.original,
    }),
  );
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
