// 管理端鉴权（服务端专用，勿在客户端引入）
// 设计要点：
//   1. 口令不再明文传输/存储：前端只提交一次明文口令，服务端 sha256 后做定时安全比对
//   2. 会话用 httpOnly Cookie 承载，浏览器 JS 读不到，避免 XSS 窃取
//   3. 会话串自带过期时间 + HMAC-SHA256 签名，服务端无状态也能防伪造/篡改
//   4. 签名密钥由口令派生 → 改口令即自动让旧会话全部失效
import crypto from "node:crypto";

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 会话有效期 2 小时

// 是否允许在生产环境开放管理端 API（默认关闭，保持「生产不暴露」）
// 打开前务必先设一个强口令 ADMIN_PASSWORD，并清楚风险。
export function adminApiEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.ADMIN_ALLOW_PRODUCTION === "true";
}

function secret(): string {
  return process.env.ADMIN_PASSWORD || "admin";
}

export function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

/** 定时安全比对口令（避免通过响应时间侧信道逐字节猜解） */
export function verifyPassword(pw: string): boolean {
  const a = Buffer.from(hashPassword(pw), "hex");
  const b = Buffer.from(hashPassword(secret()), "hex");
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// 会话签名密钥：口令 + 可选独立盐，盐用于避免改动口令前泄露会话
function sessionKey(): Buffer {
  const salt = process.env.ADMIN_SESSION_SECRET || "";
  return crypto.createHash("sha256").update(`${secret()}::${salt}`).digest();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", sessionKey()).update(payload).digest("hex");
}

/** 生成签名会话串：`<过期时间戳>.<随机标识>.<HMAC>` */
export function createSession(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${expiresAt}.${nonce}`;
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

/** 校验会话串：未过期 + 签名一致（HMAC 用定时安全比对） */
export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expStr, nonce, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  if (!nonce) return false;

  const expected = Buffer.from(sign(`${expStr}.${nonce}`), "utf8");
  const actual = Buffer.from(sig, "utf8");
  if (expected.length !== actual.length) return false;
  try {
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Set-Cookie 属性：httpOnly + SameSite=Lax，生产环境加 Secure */
export function sessionCookieHeader(token: string): string {
  const attrs = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

/** 清除会话（Max-Age=0 立即过期） */
export function clearSessionCookieHeader(): string {
  const attrs = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

export function readSession(req: Request): string | undefined {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join("="));
  }
  return undefined;
}
