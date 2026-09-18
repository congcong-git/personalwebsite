// 内容数据层（P1）
// 设计：统一异步 API，数据源由环境变量切换——
//   - 配置了 CLOUDBASE_ENV_ID/SECRET_ID/SECRET_KEY → 构建时从云开发 CMS 拉（@cloudbase/node-sdk）
//   - 否则 → 读取本地 content/ 目录（开发 / P1 验证回退，CMS 上线后可退役）
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { Locale } from "@/i18n/routing";
import { isCMSEnabled, loadCMSContent } from "./cloudbase";

export type Post = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  tags: string[];
  excerpt: string;
  lang: Locale;
  cover?: string;
  source?: string; // 首发来源：公众号名或原文 URL（可选，用于标注转载/同步）
  body: string; // Markdown 正文
  readingTime: number; // 估算阅读分钟数
};

export type Project = {
  slug: string;
  name: string;
  summary: string;
  tech: string[];
  role: string;
  link?: string;
  highlight: string;
  cover?: string;
  body?: string; // Markdown 详情正文（可选）
};

export type TimelineItem = {
  year: string;
  title: string;
  desc: string;
};

export type Profile = {
  name: string;
  skills: string[];
  timeline: TimelineItem[];
  resumeUrl?: string;
  // 公众号展示（可选）：配置后「关于」页会渲染公众号板块
  wechat?: {
    name?: string; // 公众号名称
    qr?: string; // 二维码图片路径
    desc?: string; // 一句话介绍（可选，缺省用 i18n 文案）
  };
};

export type LinkItem = {
  name: string;
  url: string;
  desc: string;
};

// 站点级可配置项（后台 settings 集合，单条），用于把"写死"的站点名、品牌、
// 社交链接、关于简介、页脚简介、SEO 文案等交给后台维护。
export type SocialItem = {
  type: string; // github / email / twitter / wechat / link 等
  url: string;
  label?: string;
};

export type SeoLocale = { title: string; description: string };
export type Seo = { zh: SeoLocale; en: SeoLocale };

export type Settings = {
  siteName: string;
  brand: string;
  bio: string; // 关于页顶部简介
  footerNote: string; // 页脚简介
  socials: SocialItem[];
  seo: Seo;
};

type RawContent = {
  posts: Post[];
  projects: Project[];
  profile: Profile;
  links: LinkItem[];
  settings: Settings;
};

// ---------- 本地内容（CMS 未配置时的回退） ----------
const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function estimateReadingTime(md: string): number {
  const cjk = (md.match(/[一-龥]/g) || []).length;
  const words = (
    md.replace(/[一-龥]/g, " ").match(/[a-zA-Z0-9]+/g) || []
  ).length;
  return Math.max(1, Math.round(cjk / 300 + words / 200));
}

// YAML frontmatter 里的 `date: 2026-08-12` 会被解析成 Date 对象，
// 统一规整成 YYYY-MM-DD 字符串，避免后续 localeCompare 出错。
function formatDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v;
  if (typeof v === "number") return new Date(v).toISOString().slice(0, 10);
  return "";
}

async function loadLocalPosts(): Promise<Post[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(POSTS_DIR);
  } catch {
    return [];
  }
  const posts = await Promise.all(
    files
      .filter((f) => f.endsWith(".md"))
      .map(async (f) => {
        const raw = await fs.readFile(path.join(POSTS_DIR, f), "utf8");
        const { data, content } = matter(raw);
        return {
          slug: (data.slug as string) ?? f.replace(/\.md$/, ""),
          title: (data.title as string) ?? "",
          date: formatDate(data.date),
          tags: (data.tags as string[]) ?? [],
          excerpt: (data.excerpt as string) ?? "",
          lang: data.lang === "en" ? "en" : ("zh" as Locale),
          cover: data.cover as string | undefined,
          source: data.source as string | undefined,
          body: content,
          readingTime: estimateReadingTime(content),
        } satisfies Post;
      })
  );
  return posts;
}

// 项目 / 关于 / 友链：结构化本地数据（CMS 上线后由 collections 接管）
const LOCAL_PROJECTS: Project[] = [
  {
    slug: "palletizing",
    name: "三抓手码垛程序",
    summary: "自动化码垛核心逻辑，贪心算法解决五花垛分层放置。",
    tech: ["算法", "机器人", "C#"],
    role: "核心开发",
    highlight: "每层 5 包（2 横 + 3 竖），按层级从低到高放置。",
    body: "## 项目背景\n\n三抓手码垛需要在有限空间内稳定堆叠五花垛。核心难点在于**横包可合并、竖包需独立旋转放置**，且每层 5 包（2 横 + 3 竖）的约束导致放包次序必须精确规划。\n\n## 核心算法\n\n采用**贪心算法**逐层求解：\n\n1. 每次抓取 3 个横包，按层级从低到高放置；\n2. 放满当前层后 Z 轴升高，进入下一层；\n3. 放包次序：层级 1 先放 `bh1 + bh2` 合并，再逐个放 `av1 / av2 / av3`；\n4. 跨层竖包（如 `bv1`）补至下一层级。\n\n## 抓手约束\n\n- 1 号抓手：禁放 b 区竖包\n- 2 号抓手：无限制\n- 3 号抓手：禁放 a 区竖包\n\n当前正在调试跨层补充逻辑，确保 `av2 / av3` 不被错误拆组。",
  },
  {
    slug: "yueqiu8",
    name: "约球吧小程序",
    summary: "球类场馆预约小程序，含管理后台与 MySQL 数据层。",
    tech: ["Vue", "Express", "MySQL"],
    role: "全栈",
    link: "https://example.com",
    highlight: "33 页小程序 + 7 个后端路由，清爽运动风设计。",
    body: "## 项目概况\n\n约球吧是一个球类场馆预约小程序，覆盖场馆浏览、预约、订单管理等完整闭环。\n\n## 技术架构\n\n- 小程序端：33 个页面，模块化拆分 `admin/js/`（utils + 8 个业务模块）\n- 后端：Express + MySQL2，7 个路由\n- 数据库：22 张表\n\n## 设计风格\n\n清爽运动风——透明背景、灰色边框、无重阴影。曾修复 API `snake_case` 与前端 `camelCase` 字段不匹配问题。",
  },
  {
    slug: "workbuddy-space",
    name: "WorkBuddySpace",
    summary: "Next.js 博客与画廊，集成 admin 与 GitHub API。",
    tech: ["Next.js", "GitHub API"],
    role: "全栈",
    highlight: "同栈经验平滑迁移到本个人站。",
    body: "## 简介\n\nWorkBuddySpace 是基于 Next.js 的博客 / 画廊站点，集成管理端与 GitHub API，用于内容发布与资源管理。\n\n本项目（个人技术站）复用了其同栈经验，从 Next.js + 云开发 CMS + EdgeOne 的混合架构平滑迁移而来。",
  },
];

const LOCAL_PROFILE: Profile = {
  name: "xuniw",
  resumeUrl: "/resume.pdf",
  wechat: {
    name: "xuniw 的技术笔记",
    qr: "/wechat-official-qr.svg",
  },
  skills: [
    "自动化码垛",
    "机器人编程",
    "算法设计",
    "Vue / Nuxt",
    "Next.js",
    "Node.js / Express",
    "MySQL",
    "Ansible",
    "Java 持久层",
    "A股短线框架",
  ],
  timeline: [
    { year: "2024", title: "三抓手码垛项目", desc: "主导五花垛贪心算法与跨层补充逻辑调试。" },
    { year: "2025", title: "约球吧小程序", desc: "从 0 到 1 完成 33 页小程序与管理后台。" },
    { year: "2026", title: "个人技术站", desc: "Next.js + 云开发 CMS + EdgeOne Makers 全栈部署。" },
  ],
};

const LOCAL_LINKS: LinkItem[] = [
  { name: "陈小群的短线笔记", url: "https://example.com", desc: "A股情绪周期与龙头战法整理" },
  { name: "某技术博客", url: "https://example.com", desc: "前端与全栈实践" },
];

// 站点级默认值（CMS 未配置时的回退；上线后由 settings 集合接管）
const LOCAL_SETTINGS: Settings = {
  siteName: "xuniw 的技术站",
  brand: "xuniw",
  bio: "自动化码垛 / 机器人编程工程师。这里记录技术实践、项目复盘与一些思考。",
  footerNote: "自动化码垛与机器人编程工程师的个人技术站，记录工程实践与思考。",
  socials: [
    { type: "github", url: "https://github.com/xuniw", label: "GitHub" },
    { type: "email", url: "mailto:hello@xuniw.dev", label: "Email" },
  ],
  seo: {
    zh: {
      title: "xuniw 的技术站",
      description: "自动化码垛 / 机器人编程工程师的个人技术站：博客、项目与思考。",
    },
    en: {
      title: "xuniw's Tech Blog",
      description: "Personal tech blog of an automation & robotics engineer.",
    },
  },
};

async function loadLocalContent(): Promise<RawContent> {
  const posts = await loadLocalPosts();
  return {
    posts,
    projects: LOCAL_PROJECTS,
    profile: LOCAL_PROFILE,
    links: LOCAL_LINKS,
    settings: LOCAL_SETTINGS,
  };
}

// ---------- 统一读取（CMS 优先，失败回退本地） ----------
let cache: RawContent | null = null;

async function loadAll(): Promise<RawContent> {
  if (cache) return cache;
  if (isCMSEnabled()) {
    try {
      cache = await loadCMSContent();
      return cache;
    } catch (e) {
      console.warn("[content] 云开发 CMS 拉取失败，回退本地内容：", e);
    }
  }
  cache = await loadLocalContent();
  return cache;
}

// ---------- 公共 API ----------
export async function getPosts(locale?: Locale): Promise<Post[]> {
  const { posts } = await loadAll();
  const filtered = locale ? posts.filter((p) => p.lang === locale) : posts;
  return filtered.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function getPost(slug: string, locale?: Locale): Promise<Post | undefined> {
  const posts = await getPosts(locale);
  return posts.find((p) => p.slug === slug);
}

export async function getProjects(): Promise<Project[]> {
  return (await loadAll()).projects;
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await loadAll()).projects.find((p) => p.slug === slug);
}

export async function getProfile(): Promise<Profile> {
  return (await loadAll()).profile;
}

export async function getLinks(): Promise<LinkItem[]> {
  return (await loadAll()).links;
}

export async function getSettings(): Promise<Settings> {
  return (await loadAll()).settings;
}

// generateStaticParams 用：返回所有 locale+slug 组合
export async function getAllPostSlugs(): Promise<{ locale: Locale; slug: string }[]> {
  const posts = await getPosts();
  return posts.map((p) => ({ locale: p.lang, slug: p.slug }));
}

export async function getAllProjectSlugs(): Promise<string[]> {
  return (await getProjects()).map((p) => p.slug);
}
