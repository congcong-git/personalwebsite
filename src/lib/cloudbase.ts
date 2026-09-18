// 云开发 CMS 适配器（P1）
// 仅当配置了 CLOUDBASE_ENV_ID / SECRET_ID / SECRET_KEY 时启用。
// 使用动态 import，本地未安装 @cloudbase/node-sdk 也不影响构建（require 只在启用时触发）。
import type { Locale } from "@/i18n/routing";
import type { LinkItem, Post, Profile, Project } from "./content";

export function isCMSEnabled(): boolean {
  return Boolean(
    process.env.CLOUDBASE_ENV_ID &&
      process.env.CLOUDBASE_SECRET_ID &&
      process.env.CLOUDBASE_SECRET_KEY
  );
}

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
type CBInit = (
  opts: { env: string; secretId: string; secretKey: string }
) => { database: () => CBDb };

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

// 统一入口：校验环境变量 + 动态加载 SDK，返回可用数据库句柄。
// 用变量承载包名，避免打包器在构建期静态解析（本地未装 @cloudbase/node-sdk 也能构建）。
export async function getCloudbaseDb(): Promise<CBDb> {
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
  return app.database();
}

export async function loadCMSContent(): Promise<{
  posts: Post[];
  projects: Project[];
  profile: Profile;
  links: LinkItem[];
}> {
  const db = await getCloudbaseDb();

  const [postsRes, projectsRes, profileRes, linksRes] = (await Promise.all([
    db.collection("posts").get(),
    db.collection("projects").get(),
    db.collection("profile").limit(1).get(),
    db.collection("links").get(),
  ])) as CBResult[];

  const profileRow = profileRes.data[0] ?? {};
  return {
    posts: postsRes.data.map(mapPost),
    projects: projectsRes.data.map(mapProject),
    profile: mapProfile(profileRow),
    links: linksRes.data.map(mapLink),
  };
}
