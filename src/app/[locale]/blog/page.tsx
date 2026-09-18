import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPosts } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { BlogList, type BlogListItem } from "@/components/BlogList";

// 静态导出（output: export）下服务端读不到 searchParams，
// 因此本页只负责取数据，筛选与分页交给客户端组件 BlogList。
export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Blog");

  const all = await getPosts(locale as Locale);
  // 只传渲染所需字段，避免把 Markdown 正文序列化进客户端
  const items: BlogListItem[] = all.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    tags: p.tags,
    excerpt: p.excerpt,
    readingTime: p.readingTime,
  }));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      {/* useSearchParams 在静态渲染下需要 Suspense 边界 */}
      <Suspense fallback={<p className="text-muted">{t("empty")}</p>}>
        <BlogList posts={items} />
      </Suspense>
    </div>
  );
}
