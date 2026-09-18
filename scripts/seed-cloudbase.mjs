// 把本地 content/ 现有数据一键灌入 CloudBase 4 个集合（可重复执行）
// 用法：node --env-file=.env.local scripts/seed-cloudbase.mjs
// 前置：已安装 @cloudbase/node-sdk，且 .env.local 已填 CLOUDBASE_ENV_ID / SECRET_ID / SECRET_KEY
// 幂等 upsert：按 keyField(slug/name) 查，已存在则更新为本地最新，不存在则新增；可反复执行。
import pkg from "@cloudbase/node-sdk";
const { init } = pkg;
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const env = process.env.CLOUDBASE_ENV_ID;
const secretId = process.env.CLOUDBASE_SECRET_ID;
const secretKey = process.env.CLOUDBASE_SECRET_KEY;

if (!env || !secretId || !secretKey) {
  console.error("❌ 请先填 .env.local 的 CLOUDBASE_ENV_ID / CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY");
  process.exit(1);
}

const app = init({ env, secretId, secretKey });
const db = app.database();

// 去掉 undefined 值（CloudBase update 不接受 undefined 字段）
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// ---------- 本地 posts：读 content/posts/*.md ----------
async function readLocalPosts() {
  const dir = path.join(process.cwd(), "content", "posts");
  let files = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const posts = [];
  for (const f of files.filter((x) => x.endsWith(".md"))) {
    const raw = await fs.readFile(path.join(dir, f), "utf8");
    const { data, content } = matter(raw);
    const date =
      data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : typeof data.date === "string"
        ? data.date
        : "";
    posts.push({
      slug: (data.slug ?? f.replace(/\.md$/, "")) ?? "",
      title: (data.title ?? "") ?? "",
      date,
      tags: Array.isArray(data.tags) ? (data.tags) : [],
      excerpt: (data.excerpt ?? "") ?? "",
      lang: data.lang === "en" ? "en" : "zh",
      cover: typeof data.cover === "string" ? data.cover : undefined,
      source: typeof data.source === "string" ? data.source : undefined,
      body: content,
    });
  }
  return posts;
}

// ---------- 本地 projects / profile / links（对应 src/lib/content.ts） ----------
const PROJECTS = [
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

const PROFILE = {
  name: "xuniw",
  resumeUrl: "/resume.pdf",
  wechat: {
    name: "xuniw 的技术笔记",
    qr: "/wechat-official-qr.svg",
    desc: "",
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

const LINKS = [
  { name: "陈小群的短线笔记", url: "https://example.com", desc: "A股情绪周期与龙头战法整理" },
  { name: "某技术博客", url: "https://example.com", desc: "前端与全栈实践" },
];

// 站点级可配置项（对应后台 settings 集合，单条）
const SETTINGS = {
  siteName: "xuniw 的技术站",
  brand: "xuniw",
  bio: "自动化码垛 / 机器人编程工程师。这里记录技术实践、项目复盘与一些思考。",
  footerNote: "自动化码垛与机器人编程工程师的个人技术站，记录工程实践与思考。",
  socials: [
    { type: "github", url: "https://github.com/xuniw", label: "GitHub" },
    { type: "email", url: "mailto:hello@xuniw.dev", label: "Email" },
  ],
  seo: {
    zh: { title: "xuniw 的技术站", description: "自动化码垛 / 机器人编程工程师的个人技术站：博客、项目与思考。" },
    en: { title: "xuniw's Tech Blog", description: "Personal tech blog of an automation & robotics engineer." },
  },
};

// ---------- 逐条 upsert：按 keyField 查，存在则更新、不存在则新增 ----------
async function upsertCollection(name, docs, keyField) {
  const col = db.collection(name);
  let added = 0;
  let updated = 0;
  for (const d of docs) {
    const key = d[keyField];
    let q;
    try {
      q = key ? await col.where({ [keyField]: key }).limit(1).get() : { data: [] };
    } catch (e) {
      const msg = String(e?.code || e?.message || "");
      if (msg.includes("DATABASE_COLLECTION_NOT_EXIST") || /not exist/i.test(msg)) {
        console.error(
          `\n❌ 集合「${name}」在 CloudBase 中不存在。请先在 CloudBase 控制台创建该集合（权限默认「所有用户可读」即可），参考《云开发开通与建集合指南.md》§2，然后重跑本脚本。`
        );
        process.exit(1);
      }
      throw e;
    }
    // 去掉 _id：新增时不带、更新时交给 doc(id) 定位
    const rest = { ...clean(d) };
    delete rest._id;
    if (q.data.length > 0) {
      const id = q.data[0]._id;
      await col.doc(id).update(rest);
      updated++;
      console.log(`  ~ ${name}/${key} (更新)`);
    } else {
      await col.add(rest);
      added++;
      console.log(`  + ${name}/${key} (新增)`);
    }
  }
  console.log(`✅ ${name} 处理完成：新增 ${added}，更新 ${updated}`);
}

const posts = await readLocalPosts();
console.log(`本地读取：posts=${posts.length} projects=${PROJECTS.length} profile=1 links=${LINKS.length} settings=1`);

await upsertCollection("posts", posts, "slug");
await upsertCollection("projects", PROJECTS, "slug");
await upsertCollection("profile", [PROFILE], "name");
await upsertCollection("links", LINKS, "name");
await upsertCollection("settings", [SETTINGS], "siteName");

console.log("\n🎉 灌库完成（已按 slug/name 幂等 upsert）。");
console.log("下一步：node scripts/verify-cloudbase.mjs 验证；pnpm build 自动从文档库拉取内容。");
