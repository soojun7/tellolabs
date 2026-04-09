import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const user = await ensureUser(userId);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    credits: user.credits,
    youtubeApiKey: user.youtubeApiKey,
    createdAt: user.createdAt,
  });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  await ensureUser(userId);

  const body = await req.json();
  const { name, youtubeApiKey } = body as { name?: string; youtubeApiKey?: string };

  const data: Record<string, string> = {};
  if (name !== undefined) data.name = name;
  if (youtubeApiKey !== undefined) data.youtubeApiKey = youtubeApiKey;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      credits: true,
      youtubeApiKey: true,
    },
  });

  return NextResponse.json(user);
}
