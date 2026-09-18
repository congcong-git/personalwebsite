"use client";
// dev-only 内容管理后台（完整 CMS 风格）
// 仪表盘布局：左侧集合导航 + 顶栏(搜索/新建/主题) + 列表卡片网格 / 分栏编辑器(表单 | 实时预览)
// 沿用 /api/admin/[collection] 的 CRUD 接口，仅 development 可用。
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "@/i18n/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Link2,
  User,
  Plus,
  Search,
  Trash2,
  ArrowLeft,
  LogOut,
  Save,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const COLLECTIONS = ["posts", "projects", "links", "profile", "settings"] as const;
type Collection = (typeof COLLECTIONS)[number];

// 集合图标映射
const COL_ICON: Record<Collection, LucideIcon> = {
  posts: FileText,
  projects: FolderKanban,
  links: Link2,
  profile: User,
  settings: Settings,
};

// 构建期内联：生产构建为 false，线上静态站点不含管理端接口，直接给出说明而不是登录框。
// （管理端 API 是动态路由，静态导出时不会产出，请求只会 404）
const ADMIN_AVAILABLE = process.env.NODE_ENV === "development";

// 集合元信息：侧边栏中文名、是否单条(profile)、用于筛选的标签字段
const META: Record<Collection, { label: string; tagField: string | null; single: boolean }> = {
  posts: { label: "文章", tagField: "tags", single: false },
  projects: { label: "项目", tagField: "tech", single: false },
  links: { label: "友链", tagField: null, single: false },
  profile: { label: "个人资料", tagField: null, single: true },
  settings: { label: "站点设置", tagField: null, single: true },
};

// 字段 schema：驱动表单渲染、校验与提交构造
type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "tags"
  | "date"
  | "url"
  | "select"
  | "objectArray"
  | "object";
interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  itemFields?: FieldDef[];
  placeholder?: string;
  help?: string;
}
const FIELDS: Record<Collection, FieldDef[]> = {
  posts: [
    { key: "slug", label: "Slug", type: "text", required: true, placeholder: "three-gripper-greedy" },
    { key: "title", label: "标题", type: "text", required: true },
    { key: "date", label: "日期", type: "date" },
    { key: "lang", label: "语言", type: "select", options: ["zh", "en"] },
    { key: "tags", label: "标签", type: "tags" },
    { key: "excerpt", label: "摘要", type: "textarea", placeholder: "列表/分享卡片显示的摘要" },
    { key: "cover", label: "封面图 URL", type: "url" },
    {
      key: "source",
      label: "来源",
      type: "text",
      placeholder: "微信公众号 / https://…",
      help: "填了会在文章页显示「来源」徽章；可填公众号名或原文链接",
    },
    { key: "body", label: "正文 (Markdown)", type: "markdown", required: true },
  ],
  projects: [
    { key: "slug", label: "Slug", type: "text", required: true },
    { key: "name", label: "名称", type: "text", required: true },
    { key: "summary", label: "简介", type: "textarea" },
    { key: "tech", label: "技术栈", type: "tags" },
    { key: "role", label: "角色", type: "text" },
    { key: "link", label: "链接", type: "url" },
    { key: "highlight", label: "亮点", type: "textarea" },
    { key: "cover", label: "封面图 URL", type: "url" },
    { key: "body", label: "正文 (Markdown)", type: "markdown" },
  ],
  profile: [
    { key: "name", label: "名称", type: "text", required: true },
    { key: "resumeUrl", label: "简历 URL", type: "url" },
    {
      key: "wechat",
      label: "公众号",
      type: "object",
      itemFields: [
        { key: "name", label: "公众号名称", type: "text" },
        { key: "qr", label: "二维码图片路径", type: "url", placeholder: "/wechat-official-qr.svg" },
        { key: "desc", label: "一句话介绍", type: "textarea" },
      ],
    },
    { key: "skills", label: "技能", type: "tags" },
    {
      key: "timeline",
      label: "时间线",
      type: "objectArray",
      itemFields: [
        { key: "year", label: "年份", type: "text" },
        { key: "title", label: "标题", type: "text" },
        { key: "desc", label: "描述", type: "textarea" },
      ],
    },
  ],
  links: [
    { key: "name", label: "名称", type: "text", required: true },
    { key: "url", label: "URL", type: "url", required: true },
    { key: "desc", label: "描述", type: "textarea" },
  ],
  settings: [
    { key: "siteName", label: "站点名称", type: "text", required: true, placeholder: "xuniw 的技术站" },
    { key: "brand", label: "品牌字标", type: "text", placeholder: "xuniw" },
    { key: "bio", label: "关于页简介", type: "textarea" },
    { key: "footerNote", label: "页脚简介", type: "textarea" },
    {
      key: "socials",
      label: "社交链接",
      type: "objectArray",
      itemFields: [
        { key: "type", label: "类型", type: "select", options: ["github", "email", "twitter", "wechat", "link"] },
        { key: "url", label: "URL", type: "url", required: true },
        { key: "label", label: "显示名(可选)", type: "text" },
      ],
    },
    {
      key: "seo",
      label: "SEO（按语言）",
      type: "object",
      itemFields: [
        {
          key: "zh",
          label: "中文",
          type: "object",
          itemFields: [
            { key: "title", label: "标题", type: "text" },
            { key: "description", label: "描述", type: "textarea" },
          ],
        },
        {
          key: "en",
          label: "English",
          type: "object",
          itemFields: [
            { key: "title", label: "Title", type: "text" },
            { key: "description", label: "Description", type: "textarea" },
          ],
        },
      ],
    },
  ],
};

// CMS 文档是 schema-less 的，值可能是字符串/数组/嵌套对象，统一用 unknown 承载，
// 在具体消费处再做窄化，避免 any 满天飞。
type Doc = Record<string, unknown>;

function titleOf(c: Collection, r: Doc): string {
  if (c === "settings") return String(r.siteName ?? META.settings.label);
  return String(r.title ?? r.name ?? r._id ?? "(无标题)");
}
function summaryOf(c: Collection, r: Doc): string {
  if (c === "posts") return String(r.excerpt ?? "");
  if (c === "projects") return String(r.summary ?? r.highlight ?? "");
  if (c === "links") return String(r.desc ?? "");
  if (c === "profile") return Array.isArray(r.skills) ? r.skills.join("、") : "";
  return "";
}
function tagsOf(c: Collection, r: Doc): string[] {
  const f = META[c].tagField;
  return f && Array.isArray(r[f]) ? (r[f] as string[]) : [];
}

// 初始化表单：从记录填充 schema 字段
function initForm(rec: Doc | null, fields: FieldDef[]): Doc {
  const form: Doc = {};
  for (const f of fields) {
    const v = rec ? rec[f.key] : undefined;
    if (f.type === "tags" || f.type === "objectArray") form[f.key] = Array.isArray(v) ? v : [];
    else if (f.type === "object")
      form[f.key] = v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Doc) } : {};
    else form[f.key] = v === undefined || v === null ? "" : v;
  }
  return form;
}

// 构造提交文档：按类型规整 + 去掉 undefined（CloudBase update 不接受 undefined）
function buildDoc(form: Doc, fields: FieldDef[]): Doc {
  const doc: Doc = {};
  for (const f of fields) {
    const v = form[f.key];
    if (v === undefined) continue;
    if (f.type === "tags" || f.type === "objectArray") doc[f.key] = Array.isArray(v) ? v : [];
    else if (f.type === "object") {
      // 去掉空子字段，避免写入空串
      const obj: Doc = {};
      if (v && typeof v === "object" && !Array.isArray(v)) {
        for (const [k, val] of Object.entries(v as Doc)) {
          if (typeof val === "string" && val.trim() === "") continue;
          obj[k] = val;
        }
      }
      doc[f.key] = obj;
    } else if (typeof v === "string" && v.trim() === "" && f.type !== "text") {
      // 可选文本字段留空则不写，避免存空串；必填文本仍保留
      if (!f.required) continue;
      doc[f.key] = v;
    } else doc[f.key] = v;
  }
  return doc;
}

function validate(form: Doc, fields: FieldDef[]): string[] {
  const errs: string[] = [];
  for (const f of fields) {
    if (!f.required) continue;
    const v = form[f.key];
    const empty =
      v === undefined ||
      v === null ||
      v === "" ||
      (Array.isArray(v) && v.length === 0);
    if (empty) errs.push(f.label);
  }
  return errs;
}

// 可搜索文本（排除正文等大字段，避免一切命中）
function searchableText(c: Collection, r: Doc): string {
  const parts: string[] = [String(r.title ?? r.name ?? ""), String(r.slug ?? "")];
  const f = META[c].tagField;
  if (f && Array.isArray(r[f])) parts.push((r[f] as string[]).join(" "));
  if (c === "posts") parts.push(String(r.excerpt ?? ""));
  if (c === "projects") parts.push(String(r.summary ?? ""), String(r.highlight ?? ""));
  if (c === "links") parts.push(String(r.desc ?? ""), String(r.url ?? ""));
  return parts.join(" ").toLowerCase();
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [collection, setCollection] = useState<Collection>("posts");
  const [records, setRecords] = useState<Doc[]>([]);
  const [mode, setMode] = useState<"idle" | "edit" | "create">("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Doc>({});
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [save, setSave] = useState<{ state: "idle" | "saving" | "ok" | "error"; msg: string }>({
    state: "idle",
    msg: "",
  });

  // 刷新后用现有会话 Cookie 恢复登录态（Cookie 为 httpOnly，前端读不到内容）
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    // 兜底超时：JS 未水合 / dev 资源被跨域拦截时请求可能一直不返回，
    // 超时后直接落到登录页，避免永远停在「正在校验登录状态」
    const timer = setTimeout(() => ctrl.abort(), 6000);
    (async () => {
      try {
        const res = await fetch("/api/admin/session", { signal: ctrl.signal });
        const j = await res.json();
        if (alive) setAuthed(res.ok && j.ok === true);
      } catch {
        if (alive) setAuthed(false);
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  async function load() {
    if (!authed) return;
    const res = await fetch(`/api/admin/${collection}`);
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const j = await res.json();
    setRecords(j.data ?? []);
  }

  // 切换集合时清空筛选与选中项（放在交互里，而不是 effect 里同步 setState）
  function switchCollection(c: Collection) {
    setMode("idle");
    setSelectedId(null);
    setSearch("");
    setActiveTag(null);
    setCollection(c);
  }

  // 登录态 / 集合变化时拉取列表：fetch 完成后再 setState（await 之后的更新不属于同步级联渲染）
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    void (async () => {
      const res = await fetch(`/api/admin/${collection}`);
      if (!alive) return;
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const j = await res.json();
      if (alive) setRecords(j.data ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [authed, collection]);

  async function login() {
    if (!password || loggingIn) return;
    setLoggingIn(true);
    setLoginErr("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginErr(String(j.error ?? "登录失败"));
        return;
      }
      setPassword("");
      setAuthed(true);
    } catch (e) {
      setLoginErr("登录失败：" + String(e));
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAuthed(false);
    setPassword("");
  }

  function startCreate() {
    setMode("create");
    setSelectedId(null);
    setForm(initForm(null, FIELDS[collection]));
    setSave({ state: "idle", msg: "" });
  }
  function startEdit(r: Doc) {
    setMode("edit");
    setSelectedId(String(r._id ?? null));
    setForm(initForm(r, FIELDS[collection]));
    setSave({ state: "idle", msg: "" });
  }

  async function saveDoc() {
    const fields = FIELDS[collection];
    const errs = validate(form, fields);
    if (errs.length) {
      setSave({ state: "error", msg: "必填缺失：" + errs.join("、") });
      return;
    }
    const doc = buildDoc(form, fields);
    if (selectedId) doc._id = selectedId;
    setSave({ state: "saving", msg: "保存中…" });
    try {
      const res = await fetch(`/api/admin/${collection}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      const j = await res.json();
      if (j.error) setSave({ state: "error", msg: "保存失败：" + j.error });
      else {
        setSave({ state: "ok", msg: "已保存" });
        if (!selectedId) setSelectedId(j.id);
        setMode("edit");
        load();
      }
    } catch (e) {
      setSave({ state: "error", msg: "保存失败：" + String(e) });
    }
  }

  async function del(r: Doc) {
    if (!confirm(`确认删除「${titleOf(collection, r)}」？`)) return;
    await fetch(`/api/admin/${collection}?id=${r._id}`, { method: "DELETE" });
    if (selectedId === String(r._id)) {
      setMode("idle");
      setSelectedId(null);
    }
    load();
  }

  // 列表过滤：搜索词 + 标签筛选
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (activeTag && !tagsOf(collection, r).includes(activeTag)) return false;
      if (q && !searchableText(collection, r).includes(q)) return false;
      return true;
    });
  }, [records, search, activeTag, collection]);

  const allTags = useMemo(() => {
    const f = META[collection].tagField;
    if (!f) return [] as string[];
    const set = new Set<string>();
    records.forEach((r) => tagsOf(collection, r).forEach((t) => set.add(t)));
    return [...set];
  }, [records, collection]);

  const isSingle = META[collection].single;

  // 生产静态站点不含管理端接口，直接说明，避免显示一个永远登录不进去的框
  if (!ADMIN_AVAILABLE) {
    return (
      <div className="admin-bg fixed inset-0 z-50 flex items-center justify-center p-4 text-foreground">
        <div className="card w-full max-w-sm p-6 text-center">
          <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-white shadow-[0_8px_24px_var(--glow)]">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold">内容管理后台</h1>
          <p className="mt-3 text-sm text-muted">
            线上站点是静态导出产物，不含管理端接口。请在本地 <code>npm run dev</code> 后访问本页。
          </p>
          <Link href="/" className="mt-4 block text-center text-sm text-primary hover:underline">
            返回站点首页
          </Link>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="admin-bg fixed inset-0 z-50 flex items-center justify-center p-4 text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          正在校验登录状态…
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-bg fixed inset-0 z-50 flex items-center justify-center p-4 text-foreground">
        <div className="card w-full max-w-sm p-7">
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-white shadow-[0_8px_24px_var(--glow)]">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">内容管理后台</h1>
            <p className="mt-2 text-sm text-muted">
              调试后台，口令默认 <code className="rounded bg-muted/30 px-1">admin</code>（可设{" "}
              <code className="rounded bg-muted/30 px-1">ADMIN_PASSWORD</code> 覆盖）
            </p>
          </div>
          <input
            type="password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="dash-input"
            placeholder="口令"
          />
          {loginErr && <p className="mt-2 text-sm text-red-500">{loginErr}</p>}
          <button
            onClick={login}
            disabled={loggingIn || !password}
            className="btn btn-primary mt-4 w-full"
          >
            {loggingIn ? "登录中…" : "进入后台"}
          </button>
          <Link href="/" className="mt-4 block text-center text-sm text-muted hover:text-primary">
            返回站点首页
          </Link>
        </div>
      </div>
    );
  }

  // 实时预览用的派生值（编辑器右栏）
  const pvTitle = String(form.title ?? form.name ?? "");
  const pvSummary = summaryOf(collection, form);
  const pvTags = tagsOf(collection, form);
  const pvCover = String(form.cover ?? "");
  const pvDate = String(form.date ?? "");
  const pvBody = String(form.body ?? "");

  return (
    <div className="admin-bg fixed inset-0 z-50 flex text-foreground">
      {/* 左侧集合导航（桌面） */}
      <aside className="glass hidden w-64 shrink-0 flex-col border-r border-border md:flex lg:w-72">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-white shadow-[0_8px_24px_var(--glow)]">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">内容管理</div>
            <div className="text-[11px] text-subtle">CMS Console</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {COLLECTIONS.map((c) => {
            const Icon = COL_ICON[c];
            return (
              <button
                key={c}
                onClick={() => switchCollection(c)}
                className={`nav-item ${collection === c ? "nav-item-active" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{META[c].label}</span>
                <span className="text-[11px] uppercase text-subtle">{c}</span>
              </button>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-border p-3 text-sm">
          <Link href="/" className="nav-item">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            返回站点
          </Link>
          <button onClick={logout} className="nav-item">
            <LogOut className="h-4 w-4 shrink-0" />
            退出登录
          </button>
        </div>
      </aside>

      {/* 右侧主区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶栏 */}
        <header className="glass flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-base font-semibold">{META[collection].label}</span>
            {isSingle && <span className="tag-pill shrink-0">单条</span>}
          </div>
          <div className="relative ml-2 flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题 / slug / 标签…"
              className="dash-input pl-9"
            />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {mode !== "idle" && (
              <button
                onClick={() => switchCollection(collection)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" /> 列表
              </button>
            )}
            {(!isSingle || (isSingle && records.length === 0)) && (
              <button onClick={startCreate} className="btn btn-primary">
                <Plus className="h-4 w-4" /> 新建
              </button>
            )}
            <ThemeToggle />
            <SaveBadge save={save} />
          </div>
        </header>

        {/* 移动端集合切换 */}
        <div className="glass flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          {COLLECTIONS.map((c) => {
            const Icon = COL_ICON[c];
            return (
              <button
                key={c}
                onClick={() => switchCollection(c)}
                className={`nav-item flex-1 ${collection === c ? "nav-item-active" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {META[c].label}
              </button>
            );
          })}
        </div>

        {/* 内容区 */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {mode === "idle" ? (
            /* 列表：卡片网格 */
            <div className="h-full overflow-y-auto p-4 md:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>共 {records.length} 条</span>
                {activeTag && (
                  <span className="tag-pill tag-pill-brand">
                    {activeTag}
                    <button
                      onClick={() => setActiveTag(null)}
                      className="ml-1 text-primary hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>

              {META[collection].tagField && allTags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  <TagChip label="全部" active={activeTag === null} onClick={() => setActiveTag(null)} />
                  {allTags.map((t) => (
                    <TagChip key={t} label={t} active={activeTag === t} onClick={() => setActiveTag(t)} />
                  ))}
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="card p-10 text-center text-muted">
                  {records.length === 0 ? "暂无记录，点右上角「新建」添加" : "无匹配结果"}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((r, i) => {
                    const Icon = COL_ICON[collection];
                    return (
                      <article
                        key={String(r._id ?? i)}
                        onClick={() => startEdit(r)}
                        className="dash-card group cursor-pointer overflow-hidden"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-elevated">
                          {r.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={String(r.cover)}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-subtle">
                              <Icon className="h-8 w-8 opacity-40" />
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                          {!isSingle && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                del(r);
                              }}
                              aria-label="删除"
                              className="icon-btn absolute right-2 top-2 bg-black/40 text-white backdrop-blur hover:bg-black/60"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="truncate font-semibold">{titleOf(collection, r)}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-muted">
                            {summaryOf(collection, r) || "—"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {tagsOf(collection, r).map((t) => (
                              <span key={t} className="tag-pill">
                                {t}
                              </span>
                            ))}
                            {collection === "posts" && r.date != null && (
                              <span className="tag-pill">{String(r.date)}</span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* 编辑器：左表单 | 右实时预览 */
            <div className="grid h-full grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
              {/* 左：表单 */}
              <div className="overflow-y-auto p-4 md:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <button onClick={() => switchCollection(collection)} className="icon-btn" aria-label="返回列表">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="text-xs text-subtle">
                      {META[collection].label} · {mode === "create" ? "新建" : "编辑"}
                    </div>
                    <div className="truncate text-sm font-semibold">
                      {titleOf(collection, form) || (mode === "create" ? "新条目" : "—")}
                    </div>
                  </div>
                  <button
                    onClick={saveDoc}
                    disabled={save.state === "saving"}
                    className="btn btn-primary ml-auto"
                  >
                    <Save className="h-4 w-4" />
                    {save.state === "saving" ? "保存中…" : "保存"}
                  </button>
                </div>
                <div className="space-y-5">
                  {FIELDS[collection].map((f) => (
                    <FieldRow
                      key={f.key}
                      def={f}
                      value={form[f.key]}
                      onChange={(v) => setForm({ ...form, [f.key]: v })}
                    />
                  ))}
                </div>
              </div>
              {/* 右：实时预览 */}
              <div className="hidden overflow-y-auto bg-surface/40 md:block">
                <div className="mx-auto max-w-2xl p-6 md:p-8">
                  {pvCover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pvCover}
                      alt=""
                      className="mb-5 w-full rounded-xl border border-border object-cover"
                    />
                  )}
                  <h1 className="text-3xl font-bold tracking-tight">{pvTitle || "未命名"}</h1>
                  {pvTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pvTags.map((t) => (
                        <span key={t} className="tag-pill">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {pvDate && <div className="mt-2 text-sm text-subtle">{pvDate}</div>}
                  {pvSummary && <p className="mt-3 text-muted">{pvSummary}</p>}
                  <hr className="my-5 border-border" />
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                      {pvBody || "*（正文为空）*"}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveBadge({ save }: { save: { state: string; msg: string } }) {
  if (save.state === "idle") return null;
  const color =
    save.state === "ok" ? "text-green-500" : save.state === "error" ? "text-red-500" : "text-muted";
  return <span className={`shrink-0 text-sm ${color}`}>{save.msg}</span>;
}

function TagChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border text-muted hover:border-border-strong hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function FieldRow({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  // 各输入控件要的是具体类型，这里统一窄化一次
  const asText = typeof value === "string" ? value : value == null ? "" : String(value);
  const asList = Array.isArray(value) ? (value as string[]) : [];
  const asRows = Array.isArray(value) ? (value as Doc[]) : [];
  const asObject = value && typeof value === "object" && !Array.isArray(value) ? (value as Doc) : {};

  const label = (
    <label className="mb-1 block text-sm font-medium">
      {def.label}
      {def.required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
  const baseInput =
    "dash-input";

  if (def.type === "markdown") {
    return (
      <div>
        {label}
        <MarkdownEditor value={asText} onChange={onChange} />
      </div>
    );
  }
  if (def.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          value={asText}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={def.placeholder}
          className={`${baseInput} font-mono`}
        />
      </div>
    );
  }
  if (def.type === "tags") {
    return (
      <div>
        {label}
        <TagInput value={asList} onChange={onChange} />
      </div>
    );
  }
  if (def.type === "objectArray") {
    return (
      <div>
        {label}
        <ObjectArrayInput def={def} value={asRows} onChange={onChange} />
      </div>
    );
  }
  if (def.type === "object") {
    return (
      <div>
        {label}
        <ObjectInput def={def} value={asObject} onChange={onChange} />
      </div>
    );
  }
  if (def.type === "select") {
    return (
      <div>
        {label}
        <select value={asText} onChange={(e) => onChange(e.target.value)} className={baseInput}>
          <option value="">（默认）</option>
          {def.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }
  // text / date / url
  return (
    <div>
      {label}
      <input
        type={def.type === "date" ? "date" : def.type === "url" ? "url" : "text"}
        value={asText}
        onChange={(e) => onChange(e.target.value)}
        placeholder={def.placeholder}
        className={baseInput}
      />
      {def.help && <p className="mt-1 text-xs text-muted">{def.help}</p>}
    </div>
  );
}

// Markdown 编辑器：工具栏（格式插入 + 图片上传）+ 正文 + 实时预览（移动端显示，桌面端预览在右栏）
function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // 在光标处插入文本；after 为空时即普通插入，非空时包裹选中内容
  function insertAtCursor(before: string, after = "", placeholder = "") {
    const ta = taRef.current;
    const v = value;
    if (!ta) {
      onChange(v + before + placeholder + after);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = v.slice(start, end) || placeholder;
    const snippet = before + sel + after;
    const next = v.slice(0, start) + snippet + v.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + before.length + sel.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      // 会话 Cookie 由浏览器自动携带，无需手动附加口令头
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.error) {
        alert("上传失败：" + j.error);
      } else {
        const alt = f.name.replace(/\.[^.]+$/, "");
        insertAtCursor(`![${alt}](${j.url})`);
      }
    } catch (err) {
      alert("上传失败：" + String(err));
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  const btn =
    "rounded-lg border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] hover:text-foreground";
  // 只存纯数据，插入动作在 onClick 里触发（避免渲染期访问 textarea ref）
  const tools: { label: string; title: string; before: string; after: string; ph: string }[] = [
    { label: "H2", title: "标题", before: "\n## ", after: "", ph: "标题" },
    { label: "B", title: "加粗", before: "**", after: "**", ph: "文字" },
    { label: "I", title: "斜体", before: "*", after: "*", ph: "文字" },
    { label: "</>", title: "行内代码", before: "`", after: "`", ph: "code" },
    { label: "链接", title: "链接", before: "[", after: "](https://)", ph: "链接文字" },
    { label: "引用", title: "引用", before: "\n> ", after: "", ph: "引用内容" },
    { label: "列表", title: "列表", before: "\n- ", after: "", ph: "项目" },
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.title}
            onClick={() => insertAtCursor(t.before, t.after, t.ph)}
            className={btn}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={btn + (uploading ? " opacity-50" : "")}
        >
          {uploading ? "上传中…" : "图片"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        placeholder="支持 Markdown，用上方工具栏插入格式或上传图片"
        className="dash-input font-mono"
      />
      {/* 移动端无右栏预览，这里单独展示；桌面端预览在右栏 */}
      <div className="mt-3 md:hidden">
        <div className="mb-1 text-xs text-muted">实时预览</div>
        <div className="markdown-body rounded-md border border-border p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {value || "*（空）*"}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    const parts = draft
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setDraft("");
  }
  return (
    <div className="dash-input flex flex-wrap items-center gap-1 py-2">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted/30 px-2 py-0.5 text-xs">
          {t}
          <button onClick={() => onChange(value.filter((x) => x !== t))} className="text-muted hover:text-red-500">
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="输入后回车添加"
        className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm outline-none"
      />
    </div>
  );
}

// 单层嵌套对象：复用 FieldRow 递归渲染子字段
function ObjectInput({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: Doc;
  onChange: (v: Doc) => void;
}) {
  const itemFields = def.itemFields ?? [];
  const obj = value && typeof value === "object" ? value : {};
  return (
    <div className="dash-card space-y-3 p-3">
      {itemFields.map((f) => (
        <FieldRow
          key={f.key}
          def={f}
          value={obj[f.key]}
          onChange={(v) => onChange({ ...obj, [f.key]: v })}
        />
      ))}
    </div>
  );
}

// 表单单元格里 unknown 值的纯文本展示
function cellText(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function ObjectArrayInput({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: Doc[];
  onChange: (v: Doc[]) => void;
}) {
  const itemFields = def.itemFields ?? [];
  return (
    <div className="space-y-3">
      {value.map((item, idx) => (
        <div key={idx} className="dash-card relative space-y-2 p-3">
          <button
            onClick={() => onChange(value.filter((_, i) => i !== idx))}
            className="icon-btn absolute right-2 top-2"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {itemFields.map((f) => (
            <div key={f.key}>
              <label className="mb-0.5 block text-xs text-muted">{f.label}</label>
              {f.type === "textarea" ? (
                <textarea
                  value={cellText(item[f.key])}
                  onChange={(e) =>
                    onChange(value.map((it, i) => (i === idx ? { ...it, [f.key]: e.target.value } : it)))
                  }
                  rows={2}
                  className="dash-input"
                />
              ) : (
                <input
                  value={cellText(item[f.key])}
                  onChange={(e) =>
                    onChange(value.map((it, i) => (i === idx ? { ...it, [f.key]: e.target.value } : it)))
                  }
                  className="dash-input"
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <button
        onClick={() => onChange([...value, Object.fromEntries(itemFields.map((f) => [f.key, ""]))])}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-border-strong hover:text-foreground"
      >
        + 添加一行
      </button>
    </div>
  );
}
