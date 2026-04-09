import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

const API_KEY = process.env.SERPAPI_API_KEY!;
const ENDPOINT = "https://serpapi.com/search.json";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q") ?? "";
  const num = searchParams.get("num") ?? "12";

  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("engine", "google_images");
  url.searchParams.set("q", query);
  url.searchParams.set("num", num);
  url.searchParams.set("hl", "ko");
  url.searchParams.set("gl", "kr");
  url.searchParams.set("api_key", API_KEY);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: "SerpAPI error", detail: err, status: res.status },
      { status: res.status },
    );
  }

  const data = await res.json();

  const items = (data.images_results ?? []).slice(0, Number(num)).map(
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

  return NextResponse.json({ items });
}
