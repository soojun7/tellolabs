import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

const API_KEY = process.env.SUPERMEME_API_KEY!;
const ENDPOINT = "https://app.supermeme.ai/api/v2/meme/image";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  const text: string = body.text ?? "";
  const count: number = Math.min(body.count ?? 6, 12);

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      text,
      count,
      aspectRatio: "16:9",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: "SuperMeme API error", detail: err, status: res.status },
      { status: res.status },
    );
  }

  const data = await res.json();
  const urls: string[] = data.memes ?? [];

  const items = urls.map((url, i) => ({
    id: `meme-${Date.now()}-${i}`,
    type: "meme" as const,
    title: text.slice(0, 60),
    thumbnail: url,
    source: "SuperMeme.ai",
    sourceUrl: url,
    tags: ["밈", "AI생성"],
  }));

  return NextResponse.json({ items });
}
