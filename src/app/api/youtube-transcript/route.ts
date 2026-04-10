import { NextRequest, NextResponse } from "next/server";
import { fetchTranscript } from "youtube-transcript-plus";
import { requireAuth } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchViaLibrary(
  videoId: string,
  languages: string[],
): Promise<{ text: string; start: number; duration: number }[]> {
  for (const lang of languages) {
    try {
      const items = await fetchTranscript(videoId, {
        lang,
        userAgent: BROWSER_UA,
        retries: 2,
        retryDelay: 1500,
      });
      if (items && items.length > 0) {
        return items.map((i: { text: string; offset: number; duration: number }) => ({
          text: i.text,
          start: (i.offset ?? 0) / 1000,
          duration: (i.duration ?? 0) / 1000,
        }));
      }
    } catch {
      continue;
    }
  }
  throw new Error("LIBRARY_FAILED");
}

async function fetchViaYouTubeDataApi(
  videoId: string,
  apiKey: string,
  languages: string[],
): Promise<{ text: string; start: number; duration: number }[]> {
  const listUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
  const listRes = await fetch(listUrl);
  if (!listRes.ok) throw new Error("YouTube API captions.list failed");

  const listData = await listRes.json();
  const tracks = listData.items as {
    id: string;
    snippet: { language: string; trackKind: string };
  }[];

  if (!tracks || tracks.length === 0) {
    throw new Error("이 영상에는 자막이 없습니다.");
  }

  let trackLang = "";
  for (const lang of languages) {
    const found = tracks.find((t) => t.snippet.language === lang);
    if (found) {
      trackLang = lang;
      break;
    }
  }
  if (!trackLang) {
    trackLang = tracks[0].snippet.language;
  }

  const timedTextUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${trackLang}&fmt=json3`;
  const ttRes = await fetch(timedTextUrl, {
    headers: { "User-Agent": BROWSER_UA },
  });

  if (!ttRes.ok) throw new Error("timedtext fetch failed");

  const ttData = await ttRes.json();
  const events = ttData.events as {
    tStartMs?: number;
    dDurationMs?: number;
    segs?: { utf8: string }[];
  }[];

  if (!events) throw new Error("No caption events");

  return events
    .filter((e) => e.segs && e.segs.length > 0)
    .map((e) => ({
      text: e.segs!.map((s) => s.utf8).join("").trim(),
      start: (e.tStartMs ?? 0) / 1000,
      duration: (e.dDurationMs ?? 0) / 1000,
    }))
    .filter((e) => e.text.length > 0);
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const { url, startTime, endTime, languages } = body as {
      url: string;
      startTime?: number;
      endTime?: number;
      languages?: string[];
    };

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "유효하지 않은 YouTube URL입니다." }, { status: 400 });
    }

    const langs = languages || ["ko", "ja", "en"];
    let snippets: { text: string; start: number; duration: number }[];

    try {
      snippets = await fetchViaLibrary(videoId, langs);
    } catch {
      const user = await prisma.user.findUnique({
        where: { id: authResult.userId },
        select: { youtubeApiKey: true },
      });

      if (user?.youtubeApiKey) {
        try {
          snippets = await fetchViaYouTubeDataApi(videoId, user.youtubeApiKey, langs);
        } catch (apiErr: unknown) {
          const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
          throw new Error(`자막을 가져올 수 없습니다. YouTube API 오류: ${msg}`);
        }
      } else {
        throw new Error(
          "YouTube 자막 추출에 실패했습니다. 마이페이지에서 YouTube API Key를 등록하면 더 안정적으로 자막을 가져올 수 있습니다.",
        );
      }
    }

    if (startTime !== undefined || endTime !== undefined) {
      snippets = snippets.filter((s) => {
        const sEnd = s.start + s.duration;
        if (startTime !== undefined && sEnd < startTime) return false;
        if (endTime !== undefined && s.start > endTime) return false;
        return true;
      });
    }

    const script = snippets.map((s) => s.text).join(" ");
    const detailedSnippets = snippets.map((s) => ({
      text: s.text,
      start: Math.round(s.start * 10) / 10,
      duration: Math.round(s.duration * 10) / 10,
    }));

    return NextResponse.json({
      videoId,
      script,
      snippets: detailedSnippets,
      totalDuration: snippets.length > 0
        ? Math.round((snippets[snippets.length - 1].start + snippets[snippets.length - 1].duration) * 10) / 10
        : 0,
    });
  } catch (err: unknown) {
    console.error("YouTube transcript error:", err);
    const msg = err instanceof Error ? err.message : "자막을 가져올 수 없습니다.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
