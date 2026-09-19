// 云开发 CMS 适配器（P1）
// 仅当配置了 CLOUDBASE_ENV_ID / SECRET_ID / SECRET_KEY 时启用。
// 使用动态 import，本地未安装 @cloudbase/node-sdk 也不影响构建（require 只在启用时触发）。
import type { Locale } from "@/i18n/routing";
import type { LinkItem, Post, Profile, Project, Settings } from "./content";

export function isCMSEnabled(): boolean {
  return Boolean(
    process.env.CLOUDBASE_ENV_ID &&
      process.env.CLOUDBASE_SECRET_ID &&
      process.env.CLOUDBASE_SECRET_KEY
  );
}

// 私有文件签发临时访问 URL 的有效期（秒），设为 1 年上限。
// 静态导出在构建期由 loadCMSContent 重新签发，因此私有文件（不开公开读）也能长期可用。
export const CLOUD_SIGN_MAX_AGE = 365 * 24 * 3600;

// CloudBase 文档数据库返回结构：{ data: [...] }
type CBResult = { data: Record<string, unknown>[] };

// 动态加载 @cloudbase/node-sdk 用到的最小类型面（只有管理端 CRUD + 构建期读取用到这些能力）
export type CBCollection = {
  get: () => Promise<CBResult>;
  limit: (n: number) => CBCollection;
  where: (query: Record<string, unknown>) => CBCollection;
  doc: (id: string) => {
    update: (doc: Record<string, unknown>) => Promise<unknown>;
    remove: () => Promise<unknown>;
  };
  add: (doc: Record<string, unknown>) => Promise<{ id: string }>;
};
export type CBDb = { collection: (name: string) => CBCollection };

// CloudBase 实例最小类型面：仅描述本项目用到的方法（storage + database），
// 规避直接依赖 @cloudbase/node-sdk 的完整类型，也避免打包器在构建期静态解析该包。
export interface CBApp {
  database(): CBDb;
  uploadFile(opts: {
    cloudPath: string;
    fileContent: Buffer | Uint8Array;
  }): Promise<{ fileID: string }>;
  getTempFileURL(opts: {
    fileList: Array<string | { fileID: string; maxAge?: number }>;
  }): Promise<{
    fileList: Array<{ fileID: string; tempFileURL: string; code?: string }>;
  }>;
}

type CBInit = (
  opts: { env: string; secretId: string; secretKey: string }
) => CBApp;

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as unknown[]).filter((x) => typeof x === "string") as string[] : [];
}

function mapPost(row: Record<string, unknown>): Post {
  const body = asString(row.body);
  return {
    slug: asString(row.slug),
    title: asString(row.title),
    date: asString(row.date),
    tags: asArray(row.tags),
    excerpt: asString(row.excerpt),
    lang: row.lang === "en" ? "en" : ("zh" as Locale),
    cover: typeof row.cover === "string" ? row.cover : undefined,
    source: typeof row.source === "string" ? row.source : undefined,
    body,
    // 阅读时长由前端/构建期估算，这里复用简单规则
    readingTime: Math.max(
      1,
      Math.round(
        ((body.match(/[一-龥]/g) || []).length) / 300 +
          ((body.replace(/[一-龥]/g, " ").match(/[a-zA-Z0-9]+/g) || []).length) / 200
      )
    ),
  };
}

function mapProject(row: Record<string, unknown>): Project {
  return {
    slug: asString(row.slug),
    name: asString(row.name),
    summary: asString(row.summary),
    tech: asArray(row.tech),
    role: asString(row.role),
    link: typeof row.link === "string" ? row.link : undefined,
    highlight: asString(row.highlight),
    cover: typeof row.cover === "string" ? row.cover : undefined,
    body: typeof row.body === "string" ? row.body : undefined,
  };
}

function mapProfile(row: Record<string, unknown>): Profile {
  const wechatRow =
    row.wechat && typeof row.wechat === "object" ? (row.wechat as Record<string, unknown>) : null;
  const wechat = wechatRow
    ? {
        name: typeof wechatRow.name === "string" ? wechatRow.name : undefined,
        qr: typeof wechatRow.qr === "string" ? wechatRow.qr : undefined,
        desc: typeof wechatRow.desc === "string" ? wechatRow.desc : undefined,
      }
    : undefined;
  return {
    name: asString(row.name, "xuniw"),
    resumeUrl: typeof row.resumeUrl === "string" ? row.resumeUrl : "/resume.pdf",
    wechat,
    skills: asArray(row.skills),
    timeline: Array.isArray(row.timeline)
      ? (row.timeline as Record<string, unknown>[]).map((t) => ({
          year: asString(t.year),
          title: asString(t.title),
          desc: asString(t.desc),
        }))
      : [],
  };
}

function mapLink(row: Record<string, unknown>): LinkItem {
  return { name: asString(row.name), url: asString(row.url), desc: asString(row.desc) };
}

function mapSettings(row: Record<string, unknown>): Settings {
  const seoRow =
    row.seo && typeof row.seo === "object" ? (row.seo as Record<string, unknown>) : null;
  const sub = (k: string) =>
    seoRow && seoRow[k] && typeof seoRow[k] === "object"
      ? (seoRow[k] as Record<string, unknown>)
      : {};
  const socialsRow = Array.isArray(row.socials) ? (row.socials as Record<string, unknown>[]) : [];
  return {
    siteName: asString(row.siteName, "xuniw 的技术站"),
    brand: asString(row.brand, "xuniw"),
    bio: asString(row.bio),
    footerNote: asString(row.footerNote),
    socials: socialsRow.map((s) => ({
      type: asString(s.type),
      url: asString(s.url),
      label: typeof s.label === "string" ? s.label : undefined,
    })),
    seo: {
      zh: { title: asString(sub("zh").title), description: asString(sub("zh").description) },
      en: { title: asString(sub("en").title), description: asString(sub("en").description) },
    },
  };
}

// 统一入口：校验环境变量 + 动态加载 SDK，返回已初始化的 CloudBase 实例。
// 用变量承载包名，避免打包器在构建期静态解析（本地未装 @cloudbase/node-sdk 也能构建）。
export async function getCloudbaseApp(): Promise<CBApp> {
  const env = process.env.CLOUDBASE_ENV_ID;
  const secretId = process.env.CLOUDBASE_SECRET_ID;
  const secretKey = process.env.CLOUDBASE_SECRET_KEY;
  if (!env || !secretId || !secretKey) {
    throw new Error("未配置 CLOUDBASE_ENV_ID / SECRET_ID / SECRET_KEY");
  }
  const sdkPkg = "@cloudbase/node-sdk";
  const mod = (await import(/* webpackIgnore: true */ sdkPkg)) as {
    init?: CBInit;
    default?: CBInit | { init?: CBInit };
  };
  const init = mod.init ?? (typeof mod.default === "function" ? mod.default : mod.default?.init);
  if (typeof init !== "function") {
    throw new Error("@cloudbase/node-sdk 加载失败：未找到 init 导出");
  }
  const app = init({ env, secretId, secretKey });
  return app as unknown as CBApp;
}

export async function getCloudbaseDb(): Promise<CBDb> {
  return (await getCloudbaseApp()).database();
}

export async function loadCMSContent(): Promise<{
  posts: Post[];
  projects: Project[];
  profile: Profile;
  links: LinkItem[];
  settings: Settings;
}> {
  const app = await getCloudbaseApp();
  const db = app.database();

  const [postsRes, projectsRes, profileRes, linksRes, settingsRes] = (await Promise.all([
    db.collection("posts").get(),
    db.collection("projects").get(),
    db.collection("profile").limit(1).get(),
    db.collection("links").get(),
    db.collection("settings").limit(1).get(),
  ])) as CBResult[];

  const profileRow = profileRes.data[0] ?? {};
  const settingsRow = settingsRes.data[0] ?? {};
  const content = {
    posts: postsRes.data.map(mapPost),
    projects: projectsRes.data.map(mapProject),
    profile: mapProfile(profileRow),
    links: linksRes.data.map(mapLink),
    settings: mapSettings(settingsRow),
  };

  // 私有存储兜底：把库里以 cloud:// 开头的文件 ID 解析为带 1 年签名的私有直链。
  // 文件保持私有（不开公开读）；仅在存在 cloud:// 值时才发起一次批量签发。
  await resolveCloudUrls(content);
  return content;
}

// cloud:// 文件 ID 前缀：CloudBase 存储返回的 fileID 形如
// cloud://<env>.<suffix>/uploads/xxx.png，需解析为带签名的访问 URL。
const CLOUD_PREFIX = "cloud://";

// 把 content 中仍以 cloud:// 开头的 cover / resumeUrl / wechat.qr 解析为带 1 年签名的私有直链。
// 保留完整签名查询串（不 strip）：私有存储无公开读，签名 URL 才是唯一可访问方式；
// 静态导出在构建期重新签发，故链接始终在有效期内。
async function resolveCloudUrls(
  content: Awaited<ReturnType<typeof loadCMSContent>>
): Promise<void> {
  const refs: { fileID: string; apply: (url: string) => void }[] = [];
  const push = (v: string | undefined, apply: (url: string) => void) => {
    if (typeof v === "string" && v.startsWith(CLOUD_PREFIX)) refs.push({ fileID: v, apply });
  };

  content.posts.forEach((p) => push(p.cover, (u) => (p.cover = u)));
  content.projects.forEach((p) => push(p.cover, (u) => (p.cover = u)));
  push(content.profile.resumeUrl, (u) => (content.profile.resumeUrl = u));
  push(content.profile.wechat?.qr, (u) => {
    if (content.profile.wechat) content.profile.wechat.qr = u;
  });

  if (refs.length === 0) return;
  try {
    const app = await getCloudbaseApp();
    const { fileList } = await app.getTempFileURL({
      fileList: refs.map((r) => ({ fileID: r.fileID, maxAge: CLOUD_SIGN_MAX_AGE })),
    });
    const map = new Map<string, string>();
    for (const f of fileList ?? []) {
      // 保留完整签名 URL（含 ?sign=...）：私有存储靠它才能访问，不 strip
      if (f.tempFileURL) map.set(f.fileID, f.tempFileURL);
    }
    for (const r of refs) {
      const url = map.get(r.fileID);
      if (url) r.apply(url);
    }
  } catch (e) {
    console.warn("[content] cloud:// 链接解析失败，保留原始 fileID：", e);
  }
}
