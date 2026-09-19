// dev-only：把 CloudBase 私有文件的 cloud:// fileID 解析为带签名的临时可访问 URL，
// 供管理后台预览（私有存储无公开读权限，cloud:// 无法直接渲染）。
// 鉴权与 upload 一致：adminApiEnabled + 会话 Cookie。
import type { NextRequest } from "next/server";
import { adminApiEnabled, readSession, verifySession } from "@/lib/admin-auth";
import { getCloudbaseApp, CLOUD_SIGN_MAX_AGE } from "@/lib/cloudbase";

// 静态导出要求可静态化，生产构建时预渲染为 404
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!adminApiEnabled()) {
    return new Response("Not Found", { status: 404 });
  }
  if (!verifySession(readSession(req))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const fileID = req.nextUrl.searchParams.get("fileID") || "";
  if (!fileID.startsWith("cloud://")) {
    return Response.json({ error: "无效的 fileID" }, { status: 400 });
  }
  try {
    const app = await getCloudbaseApp();
    const { fileList } = await app.getTempFileURL({
      fileList: [{ fileID, maxAge: CLOUD_SIGN_MAX_AGE }],
    });
    const url = fileList?.[0]?.tempFileURL;
    if (!url) return Response.json({ error: "解析失败" }, { status: 500 });
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
