// 后台保存时的自动翻译：把缺失的英文用腾讯云 TMT 补全；
// 并为中文博客文章创建/更新英文兄弟文档。仅服务端调用。
import { listDocs, removeDoc, upsertDoc } from "./cloudbase-admin";
import { translateBatch } from "./translate";

// 字段级集合：需要翻译的 LocaleText 字段（点号表示嵌套路径）
const LOCALE_FIELDS: Record<string, string[]> = {
  settings: ["siteName", "brand", "bio", "footerNote", "heroTag", "heroTitle", "heroTitleAccent", "heroSubtitle"],
  projects: ["name", "summary", "role", "highlight", "body"],
  profile: ["wechat.desc"],
};

type TextObj = { zh?: string; en?: string };

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => {
    if (o && typeof o === "object") return (o as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

// 补全集合文档里缺失的英文字段（仅当 en 为空、zh 非空时翻译，不覆盖已填英文）
export async function autoTranslate(
  collection: string,
  doc: Record<string, unknown>
): Promise<void> {
  const fields = LOCALE_FIELDS[collection] ?? [];
  const toTranslate: { field: string; zh: string }[] = [];

  for (const f of fields) {
    const v = getPath(doc, f);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const lt = v as TextObj;
      if (!lt.en && lt.zh) toTranslate.push({ field: f, zh: lt.zh });
    }
  }

  if (toTranslate.length > 0) {
    const translated = await translateBatch(toTranslate.map((t) => t.zh));
    toTranslate.forEach((t, i) => {
      const cur = getPath(doc, t.field) as TextObj | undefined;
      if (cur) cur.en = translated[i] || t.zh;
    });
  }

  // 关于页时间线为数组，逐条补全 title/desc
  if (collection === "profile" && Array.isArray(doc.timeline)) {
    const texts: string[] = [];
    (doc.timeline as Record<string, unknown>[]).forEach((item) => {
      const t = item?.title as TextObj | undefined;
      const d = item?.desc as TextObj | undefined;
      texts.push(t?.zh ?? "");
      texts.push(d?.zh ?? "");
    });
    const translated = await translateBatch(texts);
    let i = 0;
    (doc.timeline as Record<string, unknown>[]).forEach((item) => {
      const t = item?.title as TextObj | undefined;
      const d = item?.desc as TextObj | undefined;
      if (t && !t.en && t.zh) t.en = translated[i] || t.zh;
      i++;
      if (d && !d.en && d.zh) d.en = translated[i] || d.zh;
      i++;
    });
  }
}

// 为中文博客文章创建/更新英文兄弟文档
// 中英文共用同一 slug（用 lang 区分）：切换语言时 URL 仅换前缀（/zh/blog/X ↔ /en/blog/X），
// 不会因 slug 不一致导致 404。CloudBase 以 _id 为主键，相同 slug 不同 lang 的文档互不冲突。
export async function ensureEnSibling(
  post: Record<string, unknown>
): Promise<void> {
  // 仅当明确为英文文档时跳过；中文或默认空 lang 都视为源语言，生成英文兄弟文档
  if (post.lang === "en") return;
  const slug = typeof post.slug === "string" ? post.slug : "";
  if (!slug) return;

  const [title, excerpt, body] = await translateBatch([
    typeof post.title === "string" ? post.title : "",
    typeof post.excerpt === "string" ? post.excerpt : "",
    typeof post.body === "string" ? post.body : "",
  ]);

  const posts = await listDocs("posts");
  // 英文兄弟文档与中文共用 slug：按 (slug, lang) 定位，避免重复创建
  const existing = posts.find((p) => p.lang === "en" && p.slug === slug);
  // 清理旧版「X-en」slug 的残留英文文档，避免列表/路由出现重复
  const stale = posts.find((p) => p.lang === "en" && p.slug === `${slug}-en`);

  const enDoc: Record<string, unknown> = {
    slug,
    title: title || post.title,
    date: post.date,
    tags: Array.isArray(post.tags) ? post.tags : [],
    excerpt: excerpt || post.excerpt,
    lang: "en",
    cover: post.cover,
    source: post.source,
    body: body || post.body,
    readingTime: post.readingTime,
  };
  // 已存在英文兄弟文档则更新，否则新增（不预设 _id，交给 CloudBase 生成）
  if (existing && typeof existing._id === "string") enDoc._id = existing._id;

  await upsertDoc("posts", enDoc);
  if (stale && typeof stale._id === "string") await removeDoc("posts", stale._id);
}
