// 管理端会话校验：前端刷新后用它判断 Cookie 里的会话是否仍有效
import type { NextRequest } from "next/server";
import { adminApiEnabled, readSession, verifySession } from "@/lib/admin-auth";

// 静态导出要求可静态化，生产构建时预渲染为 404
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!adminApiEnabled()) return new Response("Not Found", { status: 404 });
  const ok = verifySession(readSession(req));
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { "Content-Type": "application/json" },
  });
}
