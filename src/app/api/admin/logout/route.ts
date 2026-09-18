// 管理端退出：清除会话 Cookie
import { adminApiEnabled, clearSessionCookieHeader } from "@/lib/admin-auth";

// 静态导出要求可静态化，生产构建时预渲染为 404
export const revalidate = 0;

export async function POST() {
  if (!adminApiEnabled()) return new Response("Not Found", { status: 404 });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookieHeader(),
    },
  });
}
