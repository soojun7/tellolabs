import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

export interface AuthResult {
  userId: string;
}

/**
 * Authenticate the request via Clerk.
 * Returns { userId } on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { userId };
}

export const CREDIT_COSTS: Record<string, number> = {
  "generate-image": 1,
  "generate-thumbnail": 1,
  "generate-sfx": 1,
  "tts": 2,
  "tts-voicevox": 2,
  "generate-video-clip": 5,
  "render": 10,
  "analyze-scenes": 1,
  "analyze-lines": 1,
  "analyze-style": 1,
  "analyze-thumbnail": 1,
  "rewrite-script": 1,
  "refine-text": 1,
  "suggest-thumbnail-copy": 1,
};

/**
 * Check that the user has enough credits, then deduct.
 * Returns remaining credits on success, or a 402 NextResponse if insufficient.
 */
export async function useCredits(
  userId: string,
  operation: string,
): Promise<number | NextResponse> {
  const cost = CREDIT_COSTS[operation];
  if (!cost) return -1; // free operation

  const user = await ensureUser(userId);

  if (user.credits < cost) {
    return NextResponse.json(
      {
        error: "크레딧이 부족합니다",
        required: cost,
        remaining: user.credits,
      },
      { status: 402 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: cost } },
    select: { credits: true },
  });

  return updated.credits;
}
