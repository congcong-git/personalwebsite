"use client";
// 博客列表：标签筛选 + 分页，全在客户端完成。
// 原因：站点以 `output: export` 静态导出，服务端读不到 searchParams，
// 因此筛选/分页状态放在 URL query 上、由本组件在浏览器里读取与更新。
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const PAGE_SIZE = 5;

export type BlogListItem = {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  readingTime: number;
};

export function BlogList({ posts }: { posts: BlogListItem[] }) {
  const t = useTranslations("Blog");
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTag = searchParams.get("tag") ?? "";
  const rawPage = Number(searchParams.get("page") ?? "1");
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const allTags = useMemo(
    () => Array.from(new Set(posts.flatMap((p) => p.tags))).sort(),
    [posts]
  );

  const { list, currentPage, totalPages } = useMemo(() => {
    const filtered = activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts;
    const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(total, requestedPage);
    const start = (page - 1) * PAGE_SIZE;
    return { list: filtered.slice(start, start + PAGE_SIZE), currentPage: page, totalPages: total };
  }, [posts, activeTag, requestedPage]);

  // 更新 URL（保留其它 query 参数），不滚动到顶部
  function go(next: { tag?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextTag = next.tag !== undefined ? next.tag : activeTag;
    const nextPage = next.page !== undefined ? next.page : currentPage;
    if (nextTag) params.set("tag", nextTag);
    else params.delete("tag");
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `/blog?${qs}` : "/blog", { scroll: false });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 标签筛选 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => go({ tag: "", page: 1 })}
          className={`tag-pill transition ${
            !activeTag ? "tag-pill-brand" : "hover:border-primary/40"
          }`}
        >
          {t("allTags")}
        </button>
        {allTags.map((tg) => (
          <button
            key={tg}
            onClick={() => go({ tag: tg, page: 1 })}
            className={`tag-pill transition ${
              activeTag === tg ? "tag-pill-brand" : "hover:border-primary/40"
            }`}
          >
            {tg}
          </button>
        ))}
      </div>

      {/* 文章列表 */}
      {list.length === 0 ? (
        <p className="text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="card card-interactive block p-5"
              >
                <div className="flex items-center gap-2 text-xs text-subtle">
                  <span>{p.date}</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span>{t("readingTime", { min: p.readingTime })}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold leading-snug">
                  {p.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted">
                  {p.excerpt}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.tags.map((tg) => (
                    <span key={tg} className="tag-pill">
                      {tg}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => go({ page: currentPage - 1 })}
            disabled={currentPage <= 1}
            className="btn btn-ghost px-4 py-1.5 text-sm disabled:pointer-events-none disabled:opacity-40"
          >
            {t("prev")}
          </button>
          <span className="text-sm text-muted">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => go({ page: currentPage + 1 })}
            disabled={currentPage >= totalPages}
            className="btn btn-ghost px-4 py-1.5 text-sm disabled:pointer-events-none disabled:opacity-40"
          >
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
}
