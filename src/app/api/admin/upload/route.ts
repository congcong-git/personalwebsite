// 管理端文件上传接口（图片 / PDF）
// 默认仅 development 可用；设 ADMIN_ALLOW_PRODUCTION=true 才在生产开放。
// 鉴权走 httpOnly 会话 Cookie（与 /api/admin/[collection] 一致）。
// 上传的文件优先写入 CloudBase 云存储（私有存储 => 返回 cloud:// fileID + 1 年签名预览 URL）；
// 仅当云存储上传（uploadFile）失败时回退到 public/uploads/，由 Next.js 原样静态托管（/uploads/xxx）。
// 数据库存 cloud:// fileID，构建期再由 loadCMSContent 统一签发，文件不公开读也能长期可用。
import type { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { adminApiEnabled, readSession, verifySession } from "@/lib/admin-auth";
import { getCloudbaseApp, CLOUD_SIGN_MAX_AGE } from "@/lib/cloudbase";

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

// 允许的文件类型 -> 扩展名（图片 + PDF）
const EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
  "application/pdf": ".pdf",
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
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return Response.json({ error: "仅支持图片或 PDF 文件" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return Response.json({ error: "文件超过 5MB" }, { status: 400 });
    }
    const ext = EXT[file.type] || path.extname(file.name) || ".png";
    // 用时间戳 + 随机串命名，避免重名与路径穿越
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    // 优先上传到 CloudBase 云存储（私有）：返回 cloud:// fileID（存入数据库）+ 1 年签名预览 URL。
    // 仅当 uploadFile 抛错时才回退本地 public/uploads/
    try {
      const app = await getCloudbaseApp();
      const { fileID } = await app.uploadFile({ cloudPath: `uploads/${safe}`, fileContent: buf });
      let preview: string | undefined;
      try {
        const { fileList } = await app.getTempFileURL({
          fileList: [{ fileID, maxAge: CLOUD_SIGN_MAX_AGE }],
        });
        preview = fileList?.[0]?.tempFileURL;
      } catch (signErr) {
        console.warn(
          "[upload] 预览签名失败（文件已上传，构建期会重新签发）：",
          signErr instanceof Error ? signErr.message : signErr
        );
      }
      // 字段存 fileID（构建期再签发）；正文插图用 preview（可直接渲染的签名 URL）
      return Response.json({ url: fileID, preview });
    } catch (cloudErr) {
      console.warn(
        "[upload] 云存储上传失败，回退本地 public/uploads/：",
        cloudErr instanceof Error ? cloudErr.message : cloudErr
      );
    }

    // 本地兜底：写入 public/uploads/，由 Next.js 原样静态托管
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, safe), buf);
    return Response.json({ url: `/uploads/${safe}` });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
