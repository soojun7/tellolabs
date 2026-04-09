import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

const MAX_PROJECTS = 10;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUser(userId);

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureUser(userId);

    const count = await prisma.project.count({ where: { userId } });
    if (count >= MAX_PROJECTS) {
      return NextResponse.json(
        { error: `프로젝트는 최대 ${MAX_PROJECTS}개까지 저장할 수 있습니다.` },
        { status: 400 },
      );
    }

    const body = await req.json();

    const project = await prisma.project.create({
      data: {
        userId,
        title: body.title || "Untitled",
        script: body.script || "",
        scenes: body.scenes || [],
        saved: body.saved ?? false,
        renderUrl: body.renderUrl,
        thumbnailUrl: body.thumbnailUrl,
        thumbnails: body.thumbnails,
        style: body.style,
      },
    });

    return NextResponse.json(project);
  } catch (err) {
    console.error("[POST /api/projects]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
