"use client";
// dev-only 内容管理后台（完整 CMS 风格）
// 仪表盘布局：左侧集合导航 + 顶栏(搜索/新建/主题) + 列表卡片网格 / 分栏编辑器(表单 | 实时预览)
// 沿用 /api/admin/[collection] 的 CRUD 接口，仅 development 可用。
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "@/i18n/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
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
  Pencil,
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
  // 新建文档时该字段的默认值（select 等用，如 lang 默认 zh）
  value?: string;
  // 为 url 类型附加「上传文件」按钮，选完自动回填返回的 URL
  upload?: boolean;
}
const FIELDS: Record<Collection, FieldDef[]> = {
  posts: [
    { key: "title", label: "标题", type: "text", required: true },
    { key: "date", label: "日期", type: "date" },
    { key: "lang", label: "语言", type: "select", options: ["zh", "en"], value: "zh" },
    { key: "tags", label: "标签", type: "tags" },
    { key: "excerpt", label: "摘要", type: "textarea", placeholder: "列表/分享卡片显示的摘要" },
    { key: "cover", label: "封面图 URL", type: "url", upload: true },
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
    {
      key: "name",
      label: "名称",
      type: "object",
      required: true,
      itemFields: [
        { key: "zh", label: "中文", type: "text" },
        { key: "en", label: "English", type: "text" },
      ],
    },
    {
      key: "summary",
      label: "简介",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "textarea" },
        { key: "en", label: "English", type: "textarea" },
      ],
    },
    { key: "tech", label: "技术栈", type: "tags" },
    {
      key: "role",
      label: "角色",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "text" },
        { key: "en", label: "English", type: "text" },
      ],
    },
    { key: "link", label: "链接", type: "url" },
    {
      key: "highlight",
      label: "亮点",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "textarea" },
        { key: "en", label: "English", type: "textarea" },
      ],
    },
    { key: "cover", label: "封面图 URL", type: "url", upload: true },
    {
      key: "body",
      label: "正文 (Markdown)",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "markdown" },
        { key: "en", label: "English", type: "markdown" },
      ],
    },
  ],
  profile: [
    { key: "name", label: "名称", type: "text", required: true },
    { key: "resumeUrl", label: "简历 URL", type: "url", upload: true },
    {
      key: "wechat",
      label: "公众号",
      type: "object",
      itemFields: [
        { key: "name", label: "公众号名称", type: "text" },
        { key: "qr", label: "二维码图片路径", type: "url", upload: true, placeholder: "/wechat-official-qr.svg" },
        {
          key: "desc",
          label: "一句话介绍",
          type: "object",
          itemFields: [
            { key: "zh", label: "中文", type: "textarea" },
            { key: "en", label: "English", type: "textarea" },
          ],
        },
      ],
    },
    { key: "skills", label: "技能", type: "tags" },
    {
      key: "timeline",
      label: "时间线",
      type: "objectArray",
      itemFields: [
        { key: "year", label: "年份", type: "text" },
        {
          key: "title",
          label: "标题",
          type: "object",
          itemFields: [
            { key: "zh", label: "中文", type: "text" },
            { key: "en", label: "English", type: "text" },
          ],
        },
        {
          key: "desc",
          label: "描述",
          type: "object",
          itemFields: [
            { key: "zh", label: "中文", type: "textarea" },
            { key: "en", label: "English", type: "textarea" },
          ],
        },
      ],
    },
  ],
  links: [
    { key: "name", label: "名称", type: "text", required: true },
    { key: "url", label: "URL", type: "url", required: true },
    { key: "desc", label: "描述", type: "textarea" },
  ],
  settings: [
    {
      key: "siteName",
      label: "站点名称",
      type: "object",
      required: true,
      itemFields: [
        { key: "zh", label: "中文", type: "text", placeholder: "xuniw 的技术站" },
        { key: "en", label: "English", type: "text" },
      ],
    },
    {
      key: "brand",
      label: "品牌字标",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "text", placeholder: "xuniw" },
        { key: "en", label: "English", type: "text" },
      ],
    },
    {
      key: "bio",
      label: "关于页简介",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "textarea" },
        { key: "en", label: "English", type: "textarea" },
      ],
    },
    {
      key: "heroTag",
      label: "首页 Hero · 标签",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "text", placeholder: "自动化 · 机器人 · 全栈" },
        { key: "en", label: "English", type: "text", placeholder: "Automation · Robotics · Full-stack" },
      ],
    },
    {
      key: "heroTitle",
      label: "首页 Hero · 主标题",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "text", placeholder: "你好，我是聪聪" },
        { key: "en", label: "English", type: "text", placeholder: "Hi, I'm congcong" },
      ],
    },
    {
      key: "heroTitleAccent",
      label: "首页 Hero · 渐变高亮后缀",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "text", placeholder: "一个自动化码垛工程师" },
        { key: "en", label: "English", type: "text", placeholder: "the engineer who codes robots" },
      ],
    },
    {
      key: "heroSubtitle",
      label: "首页 Hero · 副标题",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "textarea", placeholder: "自动化码垛 / 机器人编程工程师，折腾全栈与个人项目。" },
        { key: "en", label: "English", type: "textarea" },
      ],
    },
    {
      key: "footerNote",
      label: "页脚简介",
      type: "object",
      itemFields: [
        { key: "zh", label: "中文", type: "textarea" },
        { key: "en", label: "English", type: "textarea" },
      ],
    },
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

// 这些字段类型在「无正文预览」的全宽表单里跨两列，避免被压得太窄
const WIDE_FIELD_TYPES = new Set<FieldDef["type"]>([
  "textarea",
  "markdown",
  "tags",
  "object",
  "objectArray",
]);

// CMS 文档是 schema-less 的，值可能是字符串/数组/嵌套对象，统一用 unknown 承载，
// 在具体消费处再做窄化，避免 any 满天飞。
type Doc = Record<string, unknown>;

// 从「字符串」或「{zh,en}」双语值中取展示文本（优先中文），用于后台列表/预览
function textOf(v: unknown): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return typeof o.zh === "string" && o.zh ? o.zh : typeof o.en === "string" ? o.en : "";
  }
  return typeof v === "string" ? v : "";
}

function titleOf(c: Collection, r: Doc): string {
  if (c === "settings") return textOf(r.siteName) || META.settings.label;
  return textOf(r.title ?? r.name ?? r._id) || "(无标题)";
}
function summaryOf(c: Collection, r: Doc): string {
  if (c === "posts") return textOf(r.excerpt);
  if (c === "projects") return textOf(r.summary ?? r.highlight);
  if (c === "links") return textOf(r.desc);
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
      // 旧的单语 CMS 数据（字符串）加载时包成 {zh}，避免首次打开表单清空已有值
      form[f.key] =
        v && typeof v === "object" && !Array.isArray(v)
          ? { ...(v as Doc) }
          : typeof v === "string"
            ? { zh: v }
            : {};
    else form[f.key] = v === undefined || v === null ? (f.value ?? "") : v;
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
  const parts: string[] = [textOf(r.title ?? r.name), String(r.slug ?? "")];
  const f = META[c].tagField;
  if (f && Array.isArray(r[f])) parts.push((r[f] as string[]).join(" "));
  if (c === "posts") parts.push(textOf(r.excerpt));
  if (c === "projects") parts.push(textOf(r.summary), textOf(r.highlight));
  if (c === "links") parts.push(textOf(r.desc), String(r.url ?? ""));
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
  // 单条集合（个人资料/站点设置）查看优先：只读态展示、点「编辑」才可改
  const [readOnly, setReadOnly] = useState(false);
  const modeRef = useRef<"idle" | "edit" | "create">(mode);
  modeRef.current = mode;

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
    setReadOnly(false);
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
      if (!alive) return;
      const data = j.data ?? [];
      setRecords(data);
      // 单条集合：进入即打开为只读查看态（无记录则进入创建）
      if (META[collection].single && modeRef.current === "idle") {
        if (data.length > 0) {
          startEdit(data[0]);
          setReadOnly(true);
        } else {
          startCreate();
          setReadOnly(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, collection]);

  // 保存成功 / 失败后自动隐藏浮层提示，给出明确反馈又不长期占位
  useEffect(() => {
    if (save.state === "ok" || save.state === "error") {
      const t = setTimeout(() => setSave({ state: "idle", msg: "" }), 2500);
      return () => clearTimeout(t);
    }
  }, [save.state, save.msg]);

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
    setReadOnly(false);
  }
  function startEdit(r: Doc) {
    setMode("edit");
    setSelectedId(String(r._id ?? null));
    setForm(initForm(r, FIELDS[collection]));
    setSave({ state: "idle", msg: "" });
    // 列表项点击后进入只读查看，点「编辑」才可变可编辑（所有集合通用）
    setReadOnly(true);
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
    // 博客 / 项目不再暴露 slug 输入：新建时留空，由服务端按标题/名称生成拼音 slug；
    // 编辑时保留原 slug（若是旧中文 slug 也会被服务端规整为拼音），避免改标题后旧链接失效
    if (collection === "posts" || collection === "projects") {
      if (!selectedId) {
        doc.slug = "";
      } else {
        const rec = records.find((x) => String(x._id) === selectedId);
        doc.slug = typeof rec?.slug === "string" ? rec.slug : "";
      }
    }
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
        load();
        if (META[collection].single) {
          // 单条集合：保存后回到只读查看态，停留在表单
          if (!selectedId) setSelectedId(j.id);
          setMode("edit");
          setReadOnly(true);
        } else {
          // 多集合：保存后回到列表视图
          setMode("idle");
          setSelectedId(null);
        }
      }
    } catch (e) {
      setSave({ state: "error", msg: "保存失败：" + String(e) });
    }
  }

  function cancelEdit() {
    const r = records.find((x) => String(x._id) === selectedId);
    if (r) startEdit(r);
    setReadOnly(true);
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
  const pvTitle = textOf(form.title ?? form.name);
  const pvSummary = summaryOf(collection, form);
  const pvTags = tagsOf(collection, form);
  const pvCover = String(form.cover ?? "");
  const pvDate = String(form.date ?? "");
  const pvBody = textOf(form.body);
  // 仅当集合含 Markdown 正文时才显示右栏预览（个人资料/站点设置/友链无正文，右栏无意义）
  const hasBodyPreview = FIELDS[collection].some((f) => f.type === "markdown");

  return (
    <div className="admin-bg fixed inset-0 z-50 flex text-foreground">
      {/* 保存状态浮层提示：明确告知保存进行中 / 成功 / 失败 */}
      {save.state !== "idle" && (
        <div
          className={`fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${
            save.state === "ok"
              ? "bg-green-600 text-white"
              : save.state === "error"
                ? "bg-red-600 text-white"
                : "bg-foreground/90 text-background"
          }`}
        >
          {save.state === "saving" ? "保存中…" : save.msg}
        </div>
      )}
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
            {mode !== "idle" && !isSingle && (
              <button
                onClick={() => switchCollection(collection)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" /> 列表
              </button>
            )}
            {!isSingle && (
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
                            <PreviewImage
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
            <div className={`grid h-full grid-cols-1 divide-y divide-border ${hasBodyPreview ? "md:grid-cols-2 md:divide-x md:divide-y-0" : ""}`}>
              {/* 左：表单 */}
              <div className="overflow-y-auto p-4 md:p-6">
                <div className="mb-5 flex items-center gap-3">
                  {!isSingle && (
                    <button onClick={() => switchCollection(collection)} className="icon-btn" aria-label="返回列表">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs text-subtle">
                      {META[collection].label} · {readOnly ? "查看" : mode === "create" ? "新建" : "编辑"}
                    </div>
                    <div className="truncate text-sm font-semibold">
                      {titleOf(collection, form) || (mode === "create" ? "新条目" : "—")}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {readOnly ? (
                      <button onClick={() => setReadOnly(false)} className="btn btn-primary">
                        <Pencil className="h-4 w-4" /> 编辑
                      </button>
                    ) : (
                      <>
                        {!readOnly && mode === "edit" && (
                          <button onClick={cancelEdit} className="btn btn-ghost">
                            取消
                          </button>
                        )}
                        <button
                          onClick={saveDoc}
                          disabled={save.state === "saving"}
                          className="btn btn-primary"
                        >
                          <Save className="h-4 w-4" />
                          {save.state === "saving" ? "保存中…" : "保存"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {!hasBodyPreview ? (
                  // 无正文预览的集合（个人资料/站点设置/友链）：卡片 + 响应式两列网格，宽字段跨整行
                  <div className="mx-auto max-w-4xl rounded-xl border border-border bg-surface/40 p-5 sm:p-6">
                    <fieldset
                      disabled={readOnly}
                      className="grid grid-cols-1 gap-x-5 gap-y-5 border-0 p-0 m-0 min-w-0 sm:grid-cols-2"
                    >
                      {FIELDS[collection].map((f) => (
                        <div
                          key={f.key}
                          className={WIDE_FIELD_TYPES.has(f.type) ? "sm:col-span-2 min-w-0" : "min-w-0"}
                        >
                          <FieldRow
                            def={f}
                            value={form[f.key]}
                            onChange={(v) => setForm({ ...form, [f.key]: v })}
                          />
                        </div>
                      ))}
                    </fieldset>
                  </div>
                ) : (
                  <fieldset disabled={readOnly} className="space-y-5 border-0 p-0 m-0 min-w-0">
                    {FIELDS[collection].map((f) => (
                      <FieldRow
                        key={f.key}
                        def={f}
                        value={form[f.key]}
                        onChange={(v) => setForm({ ...form, [f.key]: v })}
                      />
                    ))}
                  </fieldset>
                )}
              </div>
              {/* 右：实时预览（仅含 Markdown 正文的集合显示） */}
              {hasBodyPreview && (
              <div className="hidden overflow-y-auto bg-surface/40 md:block">
                <div className="mx-auto max-w-2xl p-6 md:p-8">
                  {pvCover && (
                    <PreviewImage
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
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={MARKDOWN_COMPONENTS}
                    >
                      {pvBody || "*（正文为空）*"}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
              )}
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

// 把 cloud:// 私有文件 ID 解析为可渲染的签名 URL 字符串（供链接 href 等使用）
// 非云链接原样返回；云链接异步解析，effect 内仅做异步 setState，避免同步 setState 触发 lint 错误
function usePreviewSrc(value: string): string {
  const [cloudUrl, setCloudUrl] = useState(value);
  useEffect(() => {
    if (!value.startsWith("cloud://")) return;
    let alive = true;
    fetch(`/api/admin/file-url?fileID=${encodeURIComponent(value)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { url?: string } | null) => {
        if (alive && j?.url) setCloudUrl(j.url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [value]);
  return value.startsWith("cloud://") ? cloudUrl : value;
}

// 渲染封面/二维码图片时，自动把 cloud:// 解析为签名 URL（避免私有文件直接渲染失败）
// 普通 http(s)/本地路径原样透传，零额外请求；仅云链接走异步解析，避免 effect 内同步 setState
function PreviewImage({ src, className, alt }: { src: string; className?: string; alt: string }) {
  if (!src) return null;
  if (!src.startsWith("cloud://")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }
  return <CloudPreview src={src} className={className} alt={alt} />;
}

// 仅云链接使用：异步把 cloud:// 私有文件 ID 解析为可渲染的签名 URL（管理后台预览用，dev-only 端点）
function CloudPreview({ src, className, alt }: { src: string; className?: string; alt: string }) {
  const [resolved, setResolved] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/file-url?fileID=${encodeURIComponent(src)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { url?: string } | null) => {
        if (alive && j?.url) setResolved(j.url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [src]);
  if (!resolved) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved} alt={alt} className={className} />;
}

// 渲染 Markdown 中的图片时，跳过空 src（避免 <img src=""> 触发浏览器整页重下告警）
const MARKDOWN_COMPONENTS: Components = {
  img({ src, alt, ...props }) {
    const s = typeof src === "string" ? src : "";
    if (!s.trim()) return null;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={s} alt={alt ?? ""} {...props} />;
  },
};

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
  // 私有云存储文件（cloud://）解析为可渲染的签名 URL，普通路径原样
  const previewSrc = usePreviewSrc(asText);
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
  if (def.type === "url") {
    return (
      <div>
        {label}
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={asText}
            onChange={(e) => onChange(e.target.value)}
            placeholder={def.placeholder}
            className={`${baseInput} flex-1`}
          />
          {def.upload && (
            <UploadButton onUploaded={(u) => onChange(u)} accept="image/*,application/pdf" />
          )}
        </div>
        {def.upload && asText && (
          <div className="mt-1.5">
            {/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(asText) ? (
              <PreviewImage
                src={asText}
                alt=""
                className="h-20 w-20 rounded-md border border-border object-contain"
              />
            ) : (
              <a
                href={previewSrc}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                查看已上传文件
              </a>
            )}
          </div>
        )}
        {def.help && <p className="mt-1 text-xs text-muted">{def.help}</p>}
      </div>
    );
  }
  // text / date
  return (
    <div>
      {label}
      <input
        type={def.type === "date" ? "date" : "text"}
        value={asText}
        onChange={(e) => onChange(e.target.value)}
        placeholder={def.placeholder}
        className={baseInput}
      />
      {def.help && <p className="mt-1 text-xs text-muted">{def.help}</p>}
    </div>
  );
}

// 通用文件上传按钮：上传到 /api/admin/upload，成功后把返回 URL 交给 onChange
const UPLOAD_BTN =
  "shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] hover:text-foreground disabled:opacity-50";
function UploadButton({
  onUploaded,
  accept,
}: {
  onUploaded: (url: string) => void;
  accept: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.error) alert("上传失败：" + j.error);
      else onUploaded(j.url as string);
    } catch (err) {
      alert("上传失败：" + String(err));
    } finally {
      setBusy(false);
      if (e.target) e.target.value = "";
    }
  }
  return (
    <>
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={UPLOAD_BTN}>
        {busy ? "上传中…" : "上传文件"}
      </button>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onUpload} />
    </>
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
        insertAtCursor(`![${alt}](${j.preview || j.url})`);
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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={MARKDOWN_COMPONENTS}
          >
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
