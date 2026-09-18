"use client";
// dev-only 内容管理后台（完整 CMS 风格）
// 三栏：左侧集合导航 + 中间卡片列表(搜索/标签筛选) + 右侧字段表单(必填校验/Markdown 实时预览)
// 沿用 /api/admin/[collection] 的 CRUD 接口，仅 development 可用。
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "@/i18n/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

const COLLECTIONS = ["posts", "projects", "profile", "links"] as const;
type Collection = (typeof COLLECTIONS)[number];

// 构建期内联：生产构建为 false，线上静态站点不含管理端接口，直接给出说明而不是登录框。
// （管理端 API 是动态路由，静态导出时不会产出，请求只会 404）
const ADMIN_AVAILABLE = process.env.NODE_ENV === "development";

// 集合元信息：侧边栏中文名、是否单条(profile)、用于筛选的标签字段
const META: Record<Collection, { label: string; tagField: string | null; single: boolean }> = {
  posts: { label: "文章", tagField: "tags", single: false },
  projects: { label: "项目", tagField: "tech", single: false },
  links: { label: "友链", tagField: null, single: false },
  profile: { label: "个人资料", tagField: null, single: true },
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
};

// CMS 文档是 schema-less 的，值可能是字符串/数组/嵌套对象，统一用 unknown 承载，
// 在具体消费处再做窄化，避免 any 满天飞。
type Doc = Record<string, unknown>;

function titleOf(r: Doc): string {
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
    (async () => {
      try {
        const res = await fetch("/api/admin/session");
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
    if (!confirm(`确认删除「${titleOf(r)}」？`)) return;
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

  // 生产静态站点不含管理端接口，直接说明，避免显示一个永远登录不进去的框
  if (!ADMIN_AVAILABLE) {
    return (
      <div className="fixed inset-0 z-50 bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-sm border border-border rounded-xl p-6 shadow-sm text-center">
          <h1 className="text-xl font-bold">内容管理后台</h1>
          <p className="text-sm text-muted mt-3">
            线上站点是静态导出产物，不含管理端接口。请在本地 <code>npm run dev</code> 后访问本页。
          </p>
          <Link href="/" className="block text-center text-sm text-muted mt-4 hover:text-primary">
            返回站点首页
          </Link>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="fixed inset-0 z-50 bg-background text-foreground flex items-center justify-center p-4">
        <p className="text-sm text-muted">正在校验登录状态…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="fixed inset-0 z-50 bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-sm border border-border rounded-xl p-6 shadow-sm">
          <h1 className="text-xl font-bold">内容管理后台</h1>
          <p className="text-sm text-muted mt-2">
            调试后台，口令默认 <code>admin</code>（可设 <code>ADMIN_PASSWORD</code> 覆盖）
          </p>
          <input
            type="password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="border border-border rounded-md px-3 py-2 w-full mt-4 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="口令"
          />
          {loginErr && <p className="text-sm text-red-500 mt-2">{loginErr}</p>}
          <button
            onClick={login}
            disabled={loggingIn || !password}
            className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {loggingIn ? "登录中…" : "进入后台"}
          </button>
          <Link href="/" className="block text-center text-sm text-muted mt-3 hover:text-primary">
            返回站点首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      {/* 左侧集合导航 */}
      <aside className="border-b md:border-b-0 md:border-r border-border flex md:flex-col md:w-56 shrink-0">
        <div className="px-4 py-3 font-bold border-b border-border hidden md:block">内容管理</div>
        <nav className="flex md:flex-col overflow-x-auto">
          {COLLECTIONS.map((c) => (
            <button
              key={c}
              onClick={() => switchCollection(c)}
              className={`px-4 py-3 text-left whitespace-nowrap md:w-full hover:bg-muted/30 ${
                collection === c ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
              }`}
            >
              {META[c].label}
              <span className="text-xs text-muted ml-1">({c})</span>
            </button>
          ))}
        </nav>
        <div className="hidden md:block mt-auto p-3 border-t border-border text-xs text-muted space-y-1">
          <Link href="/" className="block hover:text-primary">← 返回站点</Link>
          <button onClick={logout} className="block text-left hover:text-primary">退出登录</button>
        </div>
      </aside>

      {/* 右侧主区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <header className="h-14 border-b border-border flex items-center gap-3 px-4 shrink-0">
          <h2 className="font-semibold">{META[collection].label}</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题 / slug / 标签…"
            className="border border-border rounded-md px-3 py-1.5 text-sm flex-1 min-w-0 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {!META[collection].single && (
            <button
              onClick={startCreate}
              className="px-3 py-1.5 bg-primary text-white rounded-md text-sm hover:opacity-90 shrink-0"
            >
              + 新建
            </button>
          )}
          <SaveBadge save={save} />
        </header>

        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* 中间列表 */}
          <section className="md:w-96 border-b md:border-b-0 md:border-r border-border overflow-y-auto shrink-0 md:max-h-full">
            {META[collection].tagField && allTags.length > 0 && (
              <div className="flex flex-wrap gap-1 p-3 border-b border-border sticky top-0 bg-background z-10">
                <TagChip label="全部" active={activeTag === null} onClick={() => setActiveTag(null)} />
                {allTags.map((t) => (
                  <TagChip key={t} label={t} active={activeTag === t} onClick={() => setActiveTag(t)} />
                ))}
              </div>
            )}
            <ul className="divide-y divide-border">
              {filtered.length === 0 && (
                <li className="p-4 text-sm text-muted">
                  {records.length === 0 ? "暂无记录，点「新建」添加" : "无匹配结果"}
                </li>
              )}
              {filtered.map((r, i) => (
                <li
                  key={String(r._id ?? i)}
                  className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/30 ${
                    selectedId === String(r._id) ? "bg-primary/10" : ""
                  }`}
                  onClick={() => startEdit(r)}
                >
                  {r.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={String(r.cover)} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted/30 flex items-center justify-center text-muted text-xs shrink-0">
                      {String(r.title ?? r.name ?? "?").slice(0, 1)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{titleOf(r)}</div>
                    <div className="text-xs text-muted truncate">{summaryOf(collection, r)}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tagsOf(collection, r).map((t) => (
                        <span key={t} className="text-[10px] rounded-full bg-muted/30 px-2 py-0.5">
                          {t}
                        </span>
                      ))}
                      {collection === "posts" && r.date != null && (
                        <span className="text-[10px] text-muted">{String(r.date)}</span>
                      )}
                    </div>
                  </div>
                  {!META[collection].single && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        del(r);
                      }}
                      className="text-xs text-red-500 hover:underline shrink-0"
                    >
                      删
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* 右侧表单 */}
          <section className="flex-1 overflow-y-auto p-6">
            {mode === "idle" ? (
              <div className="text-muted text-sm mt-10 text-center">
                从左侧选择一条记录编辑，或点「新建」添加{META[collection].label}
              </div>
            ) : (
              <FormPanel
                collection={collection}
                form={form}
                setForm={setForm}
                onSave={saveDoc}
                saving={save.state === "saving"}
                isCreate={mode === "create"}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SaveBadge({ save }: { save: { state: string; msg: string } }) {
  if (save.state === "idle") return null;
  const color =
    save.state === "ok" ? "text-green-600" : save.state === "error" ? "text-red-500" : "text-muted";
  return <span className={`text-sm ${color} shrink-0`}>{save.msg}</span>;
}

function TagChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs rounded-full px-2 py-0.5 border ${
        active ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function FormPanel({
  collection,
  form,
  setForm,
  onSave,
  saving,
  isCreate,
}: {
  collection: Collection;
  form: Doc;
  setForm: (d: Doc) => void;
  onSave: () => void;
  saving: boolean;
  isCreate: boolean;
}) {
  function setField(key: string, value: unknown) {
    setForm({ ...form, [key]: value });
  }
  const fields = FIELDS[collection];
  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{isCreate ? "新建" : "编辑"} · {META[collection].label}</h3>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
      <div className="space-y-4">
        {fields.map((f) => (
          <FieldRow key={f.key} def={f} value={form[f.key]} onChange={(v) => setField(f.key, v)} />
        ))}
      </div>
    </div>
  );
}

// Markdown 编辑器：工具栏（格式插入 + 图片上传）+ 正文 + 实时预览
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

  const btn = "px-2 py-1 text-xs border border-border rounded hover:bg-muted/30 text-foreground";
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
      <div className="flex flex-wrap items-center gap-1 mb-2">
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
        className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-mono"
      />
      <div className="mt-3">
        <div className="text-xs text-muted mb-1">实时预览</div>
        <div className="border border-border rounded-md p-4 bg-muted/5">
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {value || "*（空）*"}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
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
    <label className="block text-sm font-medium mb-1">
      {def.label}
      {def.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const baseInput =
    "w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm";

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
          className={baseInput + " font-mono"}
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
      {def.help && <p className="text-xs text-muted mt-1">{def.help}</p>}
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
    <div className="flex flex-wrap gap-1 items-center border border-border rounded-md px-2 py-2 bg-background">
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
        className="flex-1 min-w-[8rem] bg-transparent outline-none text-sm py-0.5"
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
    <div className="border border-border rounded-md p-3 space-y-3">
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
        <div key={idx} className="border border-border rounded-md p-3 space-y-2 relative">
          <button
            onClick={() => onChange(value.filter((_, i) => i !== idx))}
            className="absolute top-2 right-2 text-xs text-red-500 hover:underline"
          >
            删除
          </button>
          {itemFields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-muted mb-0.5">{f.label}</label>
              {f.type === "textarea" ? (
                <textarea
                  value={cellText(item[f.key])}
                  onChange={(e) => onChange(value.map((it, i) => (i === idx ? { ...it, [f.key]: e.target.value } : it)))}
                  rows={2}
                  className="w-full border border-border rounded px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              ) : (
                <input
                  value={cellText(item[f.key])}
                  onChange={(e) => onChange(value.map((it, i) => (i === idx ? { ...it, [f.key]: e.target.value } : it)))}
                  className="w-full border border-border rounded px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <button
        onClick={() => onChange([...value, Object.fromEntries(itemFields.map((f) => [f.key, ""]))])}
        className="text-sm border border-border rounded px-3 py-1.5 hover:bg-muted/30"
      >
        + 添加一行
      </button>
    </div>
  );
}
