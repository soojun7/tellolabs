import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const YT_TRANSCRIPT_API = "https://www.youtube-transcript.io/api/transcripts";
const YT_TRANSCRIPT_TOKEN = process.env.YT_TRANSCRIPT_API_TOKEN!;

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

interface TranscriptSnippet {
  text: string;
  start: number;
  duration: number;
}

async function fetchViaTranscriptIo(videoId: string): Promise<TranscriptSnippet[]> {
  const res = await fetch(YT_TRANSCRIPT_API, {
    method: "POST",
    headers: {
      Authorization: `Basic ${YT_TRANSCRIPT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids: [videoId] }),
  });

  if (res.status === 429) {
    throw new Error("API_RATE_LIMIT");
  }
  if (!res.ok) {
    throw new Error(`youtube-transcript.io: ${res.status}`);
  }

  const data = await res.json();
  const videoData = Array.isArray(data) ? data[0] : data;

  if (!videoData || videoData.error) {
    throw new Error(videoData?.error || "No transcript returned");
  }

  const transcript = videoData.transcript;
  if (!Array.isArray(transcript) || transcript.length === 0) {
    throw new Error("이 영상에는 자막이 없습니다.");
  }

  return transcript.map((t: { text: string; start?: number; offset?: number; duration?: number }) => ({
    text: t.text,
    start: t.start ?? t.offset ?? 0,
    duration: t.duration ?? 0,
  }));
}

async function fetchViaInnerTube(
  videoId: string,
  languages: string[],
): Promise<TranscriptSnippet[]> {
  const innertubeRes = await fetch(
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BROWSER_UA,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240101.00.00",
            hl: "ko",
          },
        },
        videoId,
      }),
    },
  );

  if (!innertubeRes.ok) throw new Error("InnerTube request failed");

  const playerData = await innertubeRes.json();
  const captionTracks =
    playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks as
      | { baseUrl: string; languageCode: string }[]
      | undefined;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("이 영상에는 자막이 없습니다.");
  }

  let selectedTrack = captionTracks[0];
  for (const lang of languages) {
    const found = captionTracks.find((t) => t.languageCode === lang);
    if (found) {
      selectedTrack = found;
      break;
    }
  }

  const captionUrl = selectedTrack.baseUrl + "&fmt=json3";
  const ttRes = await fetch(captionUrl, {
    headers: { "User-Agent": BROWSER_UA },
  });

  if (!ttRes.ok) throw new Error("Caption fetch failed");

  const text = await ttRes.text();
  if (!text || text.length < 10) throw new Error("Empty caption response");

  const ttData = JSON.parse(text);
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
    let snippets: TranscriptSnippet[];

    try {
      snippets = await fetchViaTranscriptIo(videoId);
    } catch {
      try {
        snippets = await fetchViaInnerTube(videoId, langs);
      } catch (fallbackErr: unknown) {
        const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        throw new Error(`자막을 가져올 수 없습니다: ${msg}`);
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
