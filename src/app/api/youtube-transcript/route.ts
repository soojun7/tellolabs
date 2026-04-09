import { NextRequest, NextResponse } from "next/server";
import { YouTubeTranscriptApi } from "youtube-transcript-api-js";
import { requireAuth } from "@/lib/apiAuth";

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

    const api = new YouTubeTranscriptApi();
    const langs = languages || ["ko", "ja", "en"];
    const transcript = await api.fetch(videoId, langs);

    let snippets = transcript.snippets as { text: string; start: number; duration: number }[];

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
