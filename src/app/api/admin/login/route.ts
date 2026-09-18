// 管理端登录：校验口令 → 下发 httpOnly 会话 Cookie
// 口令只在登录这一刻以明文提交一次，后续请求凭 Cookie，不再传输口令。
import type { NextRequest } from "next/server";
import {
  adminApiEnabled,
  createSession,
  sessionCookieHeader,
  verifyPassword,
} from "@/lib/admin-auth";

// 同 /api/admin/[collection]：静态导出要求可静态化，生产构建时预渲染为 404
export const revalidate = 0;

// 简易失败节流（按 IP，进程内存；重启即清零，够挡住脚本爆破）
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { n: number; first: number }>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function throttled(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (now - rec.first > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return rec.n >= MAX_ATTEMPTS;
}

function bump(ip: string) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) attempts.set(ip, { n: 1, first: now });
  else rec.n += 1;
}

export async function POST(req: NextRequest) {
  if (!adminApiEnabled()) return new Response("Not Found", { status: 404 });

  const ip = clientIp(req);
  if (throttled(ip)) {
    return new Response(
      JSON.stringify({ error: "尝试次数过多，请 10 分钟后再试" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { password } = (await req.json()) as { password?: string };
    if (typeof password !== "string" || !verifyPassword(password)) {
      bump(ip);
      return new Response(JSON.stringify({ error: "口令不正确" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    attempts.delete(ip);
    const { token, expiresAt } = createSession();
    return new Response(JSON.stringify({ ok: true, expiresAt }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": sessionCookieHeader(token),
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "请求格式错误" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
