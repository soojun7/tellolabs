import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { requireAuth } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일 크기가 10MB를 초과합니다" },
        { status: 413 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    const filename = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    let url: string;
    if (isR2Configured()) {
      url = await uploadToR2(`uploads/${filename}`, buffer);
    } else {
      const dir = join(process.cwd(), "public", "uploads");
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, filename), buffer);
      url = `/uploads/${filename}`;
    }

    return NextResponse.json({ url });
  } catch (err: unknown) {
    console.error("upload error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Upload failed" },
      { status: 500 },
    );
  }
}
