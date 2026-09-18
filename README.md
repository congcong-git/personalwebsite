# xuniw 的个人技术站

自动化码垛 / 机器人编程工程师的个人站点：中英双语博客、项目展示、关于页与简历下载。
内容存腾讯云**云开发文档型数据库**，由本仓库的调试后台或控制台维护；站点以**静态导出**方式部署到 **EdgeOne Pages**（免费、国内快）。

- 技术栈：Next.js 16（App Router）+ TypeScript + Tailwind v4 + next-intl + next-themes
- 内容源：CloudBase 文档库（构建时拉取，SSG 生成静态页）；未配置时自动回退本地 `content/`
- 部署：EdgeOne Pages（监听仓库自动构建），构建产物 `out/`

---

## 1. 本地开发

```bash
npm install          # 也可用 pnpm install
cp .env.example .env.local   # 按需填写（不填也能跑，内容走本地 content/）
npm run dev
```

打开 http://localhost:3000 → 自动跳转 `/zh`（英文站 `/en`）。

常用脚本：

| 命令 | 说明 |
|---|---|
| `npm run dev` | 本地开发服务器（含调试后台） |
| `npm run build` | 常规构建（默认，CI 用它做质量闸门） |
| `npm run build:export` | **部署构建**：静态导出到 `out/`，EdgeOne Pages 用这条 |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | 类型检查 |

> 为什么要分两种构建：EdgeOne Pages 要求 Next.js 为静态导出模式，而静态导出**不能产出任何服务端接口**。
> 管理端 API 是动态路由（读 Cookie 鉴权），若强行标成可静态化，开发态的 GET 会被预渲染缓存、鉴权失效。
> 因此 `build:export` 会在构建期间临时把 `src/app/api/admin` 挪出 `src/app`，构建结束必定还原（见 `scripts/build-export.mjs`）。
> 日常开发用 `npm run dev` / `npm run build`，不受影响。

## 2. 环境变量

复制 `.env.example` 为 `.env.local`，按需填写。**不填也能本地跑**（内容回退到 `content/`）。

| 变量 | 用途 | 不填的后果 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | 站点对外地址，用于 OG/canonical/sitemap | 回退 `http://localhost:3000` |
| `CLOUDBASE_ENV_ID` / `CLOUDBASE_SECRET_ID` / `CLOUDBASE_SECRET_KEY` | 构建时从云开发文档库拉内容 | 回退本地 `content/` |
| `ADMIN_PASSWORD` | 调试后台口令（默认 `admin`） | 默认 `admin` |
| `ADMIN_SESSION_SECRET` | 会话签名盐（可选） | 只用口令派生密钥 |
| `ADMIN_ALLOW_PRODUCTION` | 是否在生产开放后台接口（默认否） | 后台仅本地可用 |
| `NEXT_PUBLIC_GISCUS_*` | Giscus 评论 | 评论区不渲染（不报错） |
| `NEXT_PUBLIC_UMAMI_URL` / `NEXT_PUBLIC_UMAMI_ID` | Umami 统计 | 统计脚本不注入（不报错） |

> ★ 评论与统计属外部凭证，需你自行申请；代码已就绪，未配置时静默跳过，不阻塞构建与上线。

## 3. 内容管理

三种方式，任选：

1. **调试后台**（最省事，默认仅本地）：`npm run dev` → `http://localhost:3000/zh/admin` → 输口令
2. **一键播种脚本**：把本地 `content/` 灌入云开发集合（幂等，可反复执行）
   ```bash
   node --env-file=.env.local scripts/seed-cloudbase.mjs
   ```
3. **云开发控制台**手动增删记录

四个集合：`posts` / `projects` / `profile`（单条）/ `links`，字段清单见 **[云开发开通与建集合指南.md](./云开发开通与建集合指南.md)**。

本地 Markdown 文章放 `content/posts/*.md`，frontmatter 支持：
`slug` / `title` / `date` / `tags` / `excerpt` / `lang` / `cover` / `source`（首发来源，文章页显示徽章）。

## 4. 部署（EdgeOne Pages）

1. 把本仓库推到 GitHub，在 [EdgeOne Pages](https://edgeone.ai) 控制台「导入 Git 仓库」连接它
2. 框架预设选 **Next.js**；本仓库已带 `edgeone.json`，构建命令 `npm run build:export`、输出目录 `out`、Node 22.11.0 会自动填好
   - 若你改用 pnpm，把 `installCommand` 改成 `pnpm install`（默认 `npm install`，与 EdgeOne 默认行为一致）
3. 在控制台「环境变量」里填 `NEXT_PUBLIC_SITE_URL` 与三个 `CLOUDBASE_*`（否则线上内容回退到仓库里的 `content/`）
4. 保存即触发构建，之后每次 push 自动重新部署

**为什么是静态导出**：EdgeOne Pages 要求 Next.js 为静态导出模式。
因此线上**没有服务端接口**：管理端 API 不会出现在产物里，`/zh/admin` 线上只显示「请在本地运行」的说明——这是预期行为，后台本就只在本地用。
站点根路径 `/` 由 `edgeone.json` 的 redirect 指向 `/zh/`（静态托管没有 middleware，靠这层重定向）。

## 5. 已实现能力

| 类别 | 内容 |
|---|---|
| 国际化 | `/zh`、`/en` 双语路由，语言切换 |
| 主题 | 明暗主题（next-themes，无闪烁） |
| 博客 | 列表（标签筛选 + 分页）、详情（Markdown + 代码高亮 + 上下篇） |
| 搜索 | 站内全文搜索（中英混合分词 + 加权排序，零依赖） |
| SEO | `generateMetadata`、OG/Twitter 卡片、动态 OG 图、JSON-LD（WebSite/Person/Article）、`sitemap.xml`、`robots.txt` |
| RSS | `/feed.xml`（RSS 2.0） |
| 评论 | Giscus（配置后自动启用） |
| 统计 | Umami（配置后自动启用） |
| 后台 | 调试后台：集合 CRUD、字段表单、Markdown 编辑器 + 图片上传；会话鉴权（sha256 + HttpOnly Cookie） |

## 6. 目录结构

```
src/
  app/[locale]/        中英双语页面（首页/博客/项目/关于/友链/后台）
  app/                 sitemap.ts · robots.ts · feed.xml · 根 layout
  components/          Header·Footer·Search·Markdown·Giscus·Analytics…
  lib/                 content.ts(内容层) cloudbase.ts(CMS适配) admin-auth.ts(鉴权) search.ts
  messages/            zh.json · en.json（i18n 文案）
  proxy.ts             next-intl 路由中间件
content/posts/         本地 Markdown 回退内容
scripts/               gen-resume-pdf · seed-cloudbase · verify-cloudbase · patch_cms_fields
public/                resume.pdf · wechat-official-qr.svg · uploads/
```

## 7. 上线前需要替换的占位资源

| 文件 | 说明 |
|---|---|
| `public/resume.pdf` | 占位简历，替换为你的真实简历（可用 `node scripts/gen-resume-pdf.mjs` 重新生成占位） |
| `public/wechat-official-qr.svg` | 占位公众号二维码，替换为真实二维码 |
| `content/projects`（`LOCAL_PROJECTS`） | 项目数据示例，按实修改 |
| 云开发 `profile` 记录 | `name`/`skills`/`timeline`/`wechat` 按实填写 |
