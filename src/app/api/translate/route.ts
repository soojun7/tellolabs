import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

const CHUNK_SIZE = 30;

async function translateChunk(
  texts: string[],
  from: string,
  to: string,
): Promise<string[]> {
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `Translate the following ${from === "ja" ? "Japanese" : "Korean"} texts to ${to === "ko" ? "Korean" : "Japanese"}. Return ONLY the numbered translations, one per line, matching the input numbering. No explanations.\n\n${numbered}`,
      },
    ],
  });

  const output =
    (res.content[0] as { type: string; text: string }).text || "";
  const lines = output.trim().split("\n");
  const translations: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+)/);
    if (match) translations.push(match[1].trim());
  }
  while (translations.length < texts.length) translations.push("");
  return translations;
}

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { texts, from, to } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: "texts array is required" },
        { status: 400 },
      );
    }

    const allTranslations: string[] = [];

    for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
      const chunk = texts.slice(i, i + CHUNK_SIZE);
      const result = await translateChunk(chunk, from, to);
      allTranslations.push(...result);
    }

    return NextResponse.json({ translations: allTranslations });
  } catch (err: unknown) {
    console.error("Translation error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
