// 管理端图片上传接口
// 默认仅 development 可用；设 ADMIN_ALLOW_PRODUCTION=true 才在生产开放。
// 鉴权走 httpOnly 会话 Cookie（与 /api/admin/[collection] 一致）。
// 上传的图片写入 public/uploads/，由 Next.js 原样静态托管，正文里用 /uploads/xxx 引用。
import type { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { adminApiEnabled, readSession, verifySession } from "@/lib/admin-auth";

// 静态导出要求可静态化，生产构建时预渲染为 404
export const revalidate = 0;

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function guard(req: NextRequest): Response | null {
  if (!adminApiEnabled()) {
    return new Response("Not Found", { status: 404 });
  }
  if (!verifySession(readSession(req))) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

// 允许的图片类型 -> 扩展名
const EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
};

export async function POST(req: NextRequest) {
  const g = guard(req);
  if (g) return g;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "缺少文件" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "仅支持图片文件" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return Response.json({ error: "图片超过 5MB" }, { status: 400 });
    }
    const ext = EXT[file.type] || path.extname(file.name) || ".png";
    // 用时间戳 + 随机串命名，避免重名与路径穿越
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, safe), buf);
    return Response.json({ url: `/uploads/${safe}` });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
