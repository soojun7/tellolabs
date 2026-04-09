import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const API_KEY = process.env.PEXELS_API_KEY!;
const BASE = "https://api.pexels.com";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "photos"; // "photos" | "videos"
  const perPage = searchParams.get("per_page") ?? "12";

  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const endpoint =
    type === "videos"
      ? `${BASE}/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`
      : `${BASE}/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`;

  const res = await fetch(endpoint, {
    headers: { Authorization: API_KEY },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Pexels API error", status: res.status },
      { status: res.status },
    );
  }

  const data = await res.json();

  if (type === "videos") {
    const items = (data.videos ?? []).map((v: any) => ({
      id: `pexels-video-${v.id}`,
      type: "stock" as const,
      title: v.url?.split("/").pop()?.replace(/-/g, " ") ?? "Pexels Video",
      thumbnail: v.image,
      source: `Pexels · ${v.user?.name ?? ""}`,
      sourceUrl: v.url,
      duration: formatDuration(v.duration),
      tags: [],
      videoFiles: v.video_files?.slice(0, 2).map((f: any) => ({
        quality: f.quality,
        link: f.link,
        width: f.width,
        height: f.height,
      })),
    }));
    return NextResponse.json({ items, total: data.total_results });
  }

  const items = (data.photos ?? []).map((p: any) => ({
    id: `pexels-photo-${p.id}`,
    type: "stock-image" as const,
    title: p.alt || "Pexels Photo",
    thumbnail: p.src?.medium ?? p.src?.small,
    source: `Pexels · ${p.photographer ?? ""}`,
    sourceUrl: p.url,
    tags: [],
    original: p.src?.original,
  }));

  return NextResponse.json({ items, total: data.total_results });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
