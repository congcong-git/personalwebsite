import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllPostSlugs, getPost, getPosts } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import Markdown from "@/components/Markdown";
import { Giscus } from "@/components/Giscus";
import { JsonLd } from "@/components/JsonLd";

type Params = { locale: string; slug: string };

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map(({ locale, slug }) => ({ locale, slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(slug, locale as Locale);
  if (!post) return {};
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/${locale}/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/${locale}/blog/${slug}`,
      publishedTime: post.date,
      authors: ["xuniw"],
      tags: post.tags,
      images: post.cover ? [{ url: post.cover }] : [{ url: `${SITE}/${locale}/opengraph-image` }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Blog");

  const post = await getPost(slug, locale as Locale);
  if (!post) notFound();

  // 同语言按日期排序，取上/下篇
  const siblings = await getPosts(locale as Locale);
  const idx = siblings.findIndex((p) => p.slug === slug);
  const prev = idx > 0 ? siblings[idx - 1] : undefined;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : undefined;

  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    inLanguage: post.lang,
    keywords: post.tags.join(", "),
    author: { "@type": "Person", name: "xuniw" },
    mainEntityOfPage: `${SITE}/${post.lang}/blog/${post.slug}`,
    ...(post.cover ? { image: [post.cover] } : {}),
  };

  return (
    <>
      <JsonLd id="jsonld-article" data={jsonLd} />
      <article className="flex flex-col gap-8">
      <Link href="/blog" className="link-brand text-sm">
        ← {t("backToList")}
      </Link>

      <header className="card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-3 text-sm text-subtle">
          <span>{post.date}</span>
          <span>·</span>
          <span>{t("readingTime", { min: post.readingTime })}</span>
          {post.source &&
            (/^https?:\/\//.test(post.source) ? (
              <a
                href={post.source}
                target="_blank"
                rel="noopener noreferrer"
                className="tag-pill tag-pill-brand hover:underline"
              >
                {t("sourceLink")}
              </a>
            ) : (
              <span className="tag-pill tag-pill-brand">
                {t("sourceNote", { source: post.source })}
              </span>
            ))}
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tg) => (
            <span key={tg} className="tag-pill">
              {tg}
            </span>
          ))}
        </div>
      </header>

      <Markdown content={post.body} />

      {/* 上 / 下篇 */}
      <nav className="mt-4 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/blog/${prev.slug}`}
            className="card card-interactive p-4"
          >
            <p className="text-xs text-subtle">{t("prevPost")}</p>
            <p className="mt-1 font-medium leading-snug">{prev.title}</p>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/blog/${next.slug}`}
            className="card card-interactive p-4 text-right"
          >
            <p className="text-xs text-subtle">{t("nextPost")}</p>
            <p className="mt-1 font-medium leading-snug">{next.title}</p>
          </Link>
        ) : (
          <span />
        )}
      </nav>
      </article>
      <Giscus />
    </>
  );
}
