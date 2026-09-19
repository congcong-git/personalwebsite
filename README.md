# 许你我的聪的个人技术站

自动化码垛 / 机器人编程工程师的个人站点：中英双语博客、项目展示、关于页与简历下载。
内容存腾讯云**云开发文档型数据库**，由本仓库的调试后台或控制台维护；站点以**静态导出**方式部署到 **EdgeOne Pages**（免费、国内快）。

- 技术栈：Next.js 16（App Router）+ TypeScript + Tailwind v4 + next-intl + next-themes
- 内容源：CloudBase 文档库（构建时拉取，SSG 生成静态页）；未配置时自动回退本地 `content/`
- 部署：EdgeOne Pages（监听仓库自动构建），构建产物 `out/`

---

## 1. 本地开发

```bash
pnpm install         # 推荐：仓库锁文件是 pnpm-lock.yaml（v9.0）
# 或 npm install（会按 package.json 重新解析版本，不校验锁文件）
cp .env.example .env.local   # 按需填写（不填也能跑，内容走本地 content/）
pnpm dev
```

打开 http://localhost:3000 → 自动跳转 `/zh`（英文站 `/en`）。

常用脚本：

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 本地开发服务器（含调试后台） |
| `pnpm build` | 常规构建（默认，CI 用它做质量闸门） |
| `pnpm build:export` | **部署构建**：静态导出到 `out/`，EdgeOne Pages 用这条 |
| `pnpm lint` | ESLint |
| `pnpm exec tsc --noEmit` | 类型检查 |

> 为什么要分两种构建：EdgeOne Pages 要求 Next.js 为静态导出模式，而静态导出**不能产出任何服务端接口**。
> 管理端 API 是动态路由（读 Cookie 鉴权），若强行标成可静态化，开发态的 GET 会被预渲染缓存、鉴权失效。
> 因此 `build:export` 会在构建期间临时把 `src/app/api/admin` 挪出 `src/app`，构建结束必定还原（见 `scripts/build-export.mjs`）。
> 日常开发用 `pnpm dev` / `pnpm build`，不受影响。

### 启动报错排查

| 现象 | 原因 / 处理 |
|---|---|
| `pnpm : 无法将"pnpm"项识别为...` | 未装 pnpm。执行 `npm i -g pnpm@9`（锁文件为 v9），或直接改用 `npm install` + `npm run dev` |
| `Cannot find module '.../next/dist/bin/next'` | 依赖未装全（上次安装被中断）。删掉 `node_modules` 后重装 |
| `npm error Cannot read properties of null (reading 'matches')` | 目录里残留 pnpm 的 `.pnpm` 结构，npm 无法兼容。**不要混用两种包管理器**：先彻底删除 `node_modules` 再装 |
| `node_modules/next` 存在但内容为空、`ELIFECYCLE Command failed` | 当前环境不支持 pnpm 的目录链接（junction）。改用 `npm install` 的扁平结构 |
| `npm warn EBADENGINE` | Node 版本偏低，建议 20.19+ 或 22.x |

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
| `NEXT_PUBLIC_51LA_ID` / `NEXT_PUBLIC_51LA_CK` | 51.la 统计 | 统计脚本不注入（不报错） |

> ★ 评论与统计属外部凭证，需你自行申请；代码已就绪，未配置时静默跳过，不阻塞构建与上线。

## 3. 内容管理

三种方式，任选：

1. **调试后台**（最省事，默认仅本地）：`pnpm dev` → `http://localhost:3000/zh/admin` → 输口令
2. **一键播种脚本**：把本地 `content/` 灌入云开发集合（幂等，可反复执行）
   ```bash
   node --env-file=.env.local scripts/seed-cloudbase.mjs
   ```
3. **云开发控制台**手动增删记录

五个集合：`posts` / `projects` / `profile`（单条）/ `links` / `settings`（站点设置，单条），字段清单见 **[云开发开通与建集合指南.md](./云开发开通与建集合指南.md)**。

本地 Markdown 文章放 `content/posts/*.md`，frontmatter 支持：
`slug` / `title` / `date` / `tags` / `excerpt` / `lang` / `cover` / `source`（首发来源，文章页显示徽章）。

### 3.1 内容来源对照：前端写死 vs 后台配置

本站的"内容"分两路：**后台管理的动态内容**（存 CloudBase 文档库，经 `/zh/admin` 维护）与**前端写死的静态内容**（在代码 / 配置文件 / i18n 文案里，不经后台）。

> 关键前提：页面是否读取后台数据，取决于是否配置了 `CLOUDBASE_*` 环境变量。
> - 已配置 → 页面读取 CloudBase（即后台管理的内容）；
> - 未配置 → 回退到本地兜底（`content/posts/*.md` + `src/lib/content.ts` 里的 `LOCAL_*` 常量），此时后台的修改**不会影响线上展示**（后台仍会把数据写进 CloudBase，只是站点没连它）。

#### A. 后台管理（CloudBase 集合，经 `/zh/admin` 维护）

| 集合 | 渲染位置 | 可经后台配置的字段 |
|---|---|---|
| `posts`（文章） | 首页「最新文章」、/blog 列表与详情 | slug、title、date、lang(zh/en)、tags、excerpt、cover、source(首发来源)、body(Markdown) |
| `projects`（项目） | 首页「精选项目」、/projects 列表与详情 | slug、name、summary、tech[]、role、link、highlight、cover、body |
| `links`（友链） | /links | name、url、desc |
| `profile`（个人资料，单条） | /about | name、resumeUrl、wechat{name,qr,desc}、skills[]、timeline[{year,title,desc}] |
| `settings`（站点设置，单条） | 全站（Header / Footer / About / SEO / OG 图） | siteName、brand、bio(关于页简介)、footerNote(页脚简介)、socials[{type,url,label}]、seo{zh:{title,description}, en:{title,description}} |

#### B. 前端写死（不经后台，改这些要去动代码 / 文案）

| 内容 | 所在位置 |
|---|---|
| 导航结构 & 文案（首页/博客/项目/关于/友链） | `Header.tsx` / `Footer.tsx` 的 `items` 数组，标签来自 i18n |
| 首页 Hero 标题 / 副标题 / 标签 / CTA 文案 | i18n `Home` 命名空间 |
| 关于页公众号描述兜底、各小节标题 | i18n `About` 命名空间 |
| 页脚技术栈说明、版权年份 | i18n `Footer` 命名空间 |
| 主题与配色（深浅色变量、品牌渐变） | `globals.css` 的 CSS 变量（`.dark` 下的 `--brand-*`、`--background` 等）+ `next-themes` 配置 |
| 双语路由（zh/en）、语言切换项 | `src/i18n/routing.ts`、`navigation.ts` |
| 评论 / 统计接入 | Giscus / 51.la，靠环境变量（`NEXT_PUBLIC_GISCUS_*`、`NEXT_PUBLIC_51LA_*`）开启，非后台 |
| 本地兜底内容（仅在未配置 CloudBase 时生效） | `content/posts/*.md`（文章）、`src/lib/content.ts` 内 `LOCAL_PROJECTS` / `LOCAL_PROFILE` / `LOCAL_LINKS` / `LOCAL_SETTINGS` 常量（项目/个人/友链/站点设置） |

> 一句话总结：能"在后台点几下就改"的只有 A 表里的五张集合（含 `settings`）；站点的名字、品牌、社交链接、关于页简介、页脚简介、SEO 文案现在都走 `settings` 集合，其余导航文案、配色、双语、评论/统计仍属 B 表（代码/i18n/环境变量）。

## 4. 部署（EdgeOne Pages）

1. 本地仓库已初始化并完成首次提交。创建空的 GitHub 仓库后关联并推送：
   ```bash
   git remote add origin <你的仓库地址>
   git branch -M main
   git push -u origin main
   ```
   然后在 [EdgeOne Pages](https://edgeone.ai) 控制台「导入 Git 仓库」连接它
2. 框架预设选 **Next.js**；本仓库已带 `edgeone.json`，安装命令 `pnpm install --frozen-lockfile`、构建命令 `npm run build:export`、输出目录 `out`、Node 22.11.0 会自动填好
   - `build:export` 内部调的是 Node 脚本，用 `npm run` 包一层即可，不依赖包管理器
   - EdgeOne 支持 npm 8~10 / pnpm 6~9 / yarn 1；本仓库锁文件 `pnpm-lock.yaml`（v9.0），因此固定走 pnpm
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
| 统计 | 51.la（配置后自动启用） |
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
