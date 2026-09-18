// 站内全文搜索（零依赖实现）
// 设计：CJK 按单字索引（中文子串召回好）、英文/数字按词索引；
//      标题/标签/正文分别加权打分。适配小型博客，无需额外依赖。
import type { Post } from "./content";

export type SearchDoc = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  body: string; // 纯文本（已剥离 markdown）
  url: string;
};

// 剥离 markdown 为纯文本（搜索索引用，无需完美还原格式）
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // 代码块
    .replace(/`[^`]*`/g, " ") // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接保留文字
    .replace(/[#>*_~`]/g, " ") // 标记符号
    .replace(/\s+/g, " ")
    .trim();
}

// 分词：CJK 单字 + 英文/数字词（小写）
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const cjk = text.match(/[一-龥]/g);
  if (cjk) tokens.push(...cjk);
  const words = text.toLowerCase().match(/[a-z0-9]+/g);
  if (words) tokens.push(...words);
  return tokens;
}

function freq(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

export type IndexedDoc = SearchDoc & {
  _body: Map<string, number>;
  _title: Set<string>;
  _tags: Set<string>;
};

export function buildIndex(docs: SearchDoc[]): IndexedDoc[] {
  return docs.map((d) => ({
    ...d,
    _body: freq(tokenize(`${d.excerpt} ${d.body}`)),
    _title: new Set(tokenize(d.title)),
    _tags: new Set(d.tags.flatMap((t) => tokenize(t))),
  }));
}

export type SearchResult = {
  doc: SearchDoc;
  score: number;
  snippet: string;
};

function makeSnippet(d: SearchDoc, query: string): string {
  const q = query.trim().toLowerCase();
  if (!q) return d.excerpt;
  const idx = d.body.toLowerCase().indexOf(q);
  if (idx >= 0) {
    const start = Math.max(0, idx - 30);
    const end = Math.min(d.body.length, idx + q.length + 50);
    return (start > 0 ? "…" : "") + d.body.slice(start, end).trim() + "…";
  }
  return d.excerpt;
}

export function search(index: IndexedDoc[], query: string, limit = 8): SearchResult[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const results: SearchResult[] = [];
  for (const d of index) {
    let score = 0;
    for (const qt of qTokens) {
      if (d._title.has(qt)) score += 6;
      if (d._tags.has(qt)) score += 4;
      const c = d._body.get(qt) || 0;
      if (c > 0) score += Math.min(c, 8);
    }
    if (score > 0) results.push({ doc: d, score, snippet: makeSnippet(d, query) });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// 由 Post 列表构建当前语言的搜索文档
export function buildSearchDocs(posts: Post[], locale: string): SearchDoc[] {
  return posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    tags: p.tags,
    body: stripMarkdown(p.body),
    url: `/${locale}/blog/${p.slug}`,
  }));
}
