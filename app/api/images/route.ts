// app/api/images/route.ts
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  // 找到项目根目录下的 public/images 目录
  const imagesDir = path.join(process.cwd(), "public", "images");
  let files: string[] = [];
  try {
    files = await fs.readdir(imagesDir);
  } catch (err) {
    return NextResponse.json({ error: "Cannot read images folder" }, { status: 500 });
  }

  // 只保留常用图片后缀
  const images = files
    .filter((fn) => /\.(jpe?g|png|gif|webp)$/i.test(fn))
    .map((fn) => `/images/${fn}`);

  return NextResponse.json(images);
}
