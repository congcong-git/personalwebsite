// 管理端 API：集合 CRUD
// 安全：
//   1. 默认仅 development 可用（生产 404）；显式设 ADMIN_ALLOW_PRODUCTION=true 才在生产开放
//   2. 鉴权走 httpOnly 会话 Cookie（HMAC 签名 + 过期），不再接受明文口令头
import type { NextRequest } from "next/server";
import { listDocs, upsertDoc, removeDoc } from "@/lib/cloudbase-admin";
import { adminApiEnabled, readSession, verifySession } from "@/lib/admin-auth";
import { autoTranslate, ensureEnSibling } from "@/lib/auto-translate";
import { normalizeSlug } from "@/lib/slug";

// 说明：站点以 `output: export` 静态导出（EdgeOne Pages 要求），导出构建要求所有
// route handler 可静态化，故声明 force-static。生产构建时 NODE_ENV=production、
// adminApiEnabled() 为假 → 预渲染成 404，线上不存在管理端接口（符合 dev-only 设计）。
export const revalidate = 0;

// 允许访问的集合（与 admin 页侧边栏一致）
const COLLECTIONS = ["posts", "projects", "profile", "links", "settings"];

// 静态导出要求动态段必须枚举参数，且开发态也会校验「请求的 param 是否在列表里」，
// 所以这里要把真实集合列全（缺一个，访问该集合就会 500）。
// 生产构建下 adminApiEnabled() 为假 → 这些路径被预渲染成 404，线上无可用管理端接口。
export function generateStaticParams() {
  return COLLECTIONS.map((collection) => ({ collection }));
}

function guard(req: NextRequest): Response | null {
  if (!adminApiEnabled()) {
    return new Response("Not Found", { status: 404 });
  }
  if (!verifySession(readSession(req))) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const g = guard(req);
  if (g) return g;
  const { collection } = await params;
  try {
    const data = await listDocs(collection);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const g = guard(req);
  if (g) return g;
  const { collection } = await params;
  try {
    const doc = (await req.json()) as Record<string, unknown>;

    // 仅对带 slug 的集合（posts / projects）做 slug 归一化：
    // 中文转拼音得到 ASCII slug，避免中文 slug 在静态导出 / 路由匹配中 404。
    if (collection === "posts" || collection === "projects") {
      const slugSource =
        typeof doc.title === "string" && doc.title
          ? doc.title
          : doc.name && typeof doc.name === "object" && typeof (doc.name as Record<string, unknown>).zh === "string"
            ? ((doc.name as Record<string, unknown>).zh as string)
            : "";
      const baseSlug = normalizeSlug(doc.slug, slugSource);
      // 同集合内保证唯一：按 (slug, lang) 区分，允许中英文兄弟文档共享同一 slug
      const myId = typeof doc._id === "string" ? doc._id : null;
      const myLang = typeof doc.lang === "string" ? doc.lang : undefined;
      let existing: Record<string, unknown>[] = [];
      try {
        existing = await listDocs(collection);
      } catch {
        existing = [];
      }
      let candidate = baseSlug;
      let n = 2;
      while (existing.some((e) => e.slug === candidate && e.lang === myLang && e._id !== myId)) {
        candidate = `${baseSlug}-${n}`;
        n++;
      }
      doc.slug = candidate;
    }

    // 保存时自动翻译：补全缺失的英文（仅 dev 后台；无 TMT 密钥时优雅跳过、英文留空回退中文）
    await autoTranslate(collection, doc);
    const id = await upsertDoc(collection, doc);
    // 博客文章：只要不是英文文档，就自动生成 / 更新英文兄弟文档（中文或默认空 lang 均视为源语言）
    if (collection === "posts" && doc.lang !== "en") {
      try {
        await ensureEnSibling(doc);
      } catch (e) {
        console.warn("[admin] 英文兄弟文档生成失败：", e);
      }
    }
    return Response.json({ id });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const g = guard(req);
  if (g) return g;
  const { collection } = await params;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "missing id" }, { status: 400 });
  try {
    await removeDoc(collection, id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
