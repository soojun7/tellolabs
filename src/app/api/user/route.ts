import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function getOrCreateUser(userId: string) {
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name: clerkUser.firstName || email.split("@")[0],
        credits: 100,
      },
    });
  }
  return user;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const user = await getOrCreateUser(userId);

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

  await getOrCreateUser(userId);

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
