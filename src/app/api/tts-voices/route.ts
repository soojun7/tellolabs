import { NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";

export async function GET() {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ElevenLabs API error: ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const PINNED_VOICE = {
      voice_id: "4JJwo477JUAx3HV0T7n7",
      name: "요한",
      language: "ko",
      accent: "korean",
      preview_url: "",
    };

    const apiVoices = (data.voices ?? []).map(
      (v: { voice_id: string; name: string; labels?: Record<string, string>; preview_url?: string }) => ({
        voice_id: v.voice_id,
        name: v.name,
        language: v.labels?.language ?? "",
        accent: v.labels?.accent ?? "",
        preview_url: v.preview_url ?? "",
      }),
    );

    const hasPinned = apiVoices.some((v: { voice_id: string }) => v.voice_id === PINNED_VOICE.voice_id);
    const voices = hasPinned
      ? [apiVoices.find((v: { voice_id: string }) => v.voice_id === PINNED_VOICE.voice_id)!, ...apiVoices.filter((v: { voice_id: string }) => v.voice_id !== PINNED_VOICE.voice_id)]
      : [PINNED_VOICE, ...apiVoices];

    return NextResponse.json({ voices });
  } catch (err: unknown) {
    console.error("Voices fetch error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Failed to fetch voices" },
      { status: 500 },
    );
  }
}
