import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPosts, getProjects } from "@/lib/content";
import type { Locale } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const latest = (await getPosts(locale as Locale)).slice(0, 3);
  const featured = (await getProjects()).slice(0, 3);

  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "xuniw 的技术站",
    url: SITE,
    inLanguage: locale,
  };
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "xuniw",
    url: SITE,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      ></script>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      ></script>
      <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="flex flex-col items-start gap-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="max-w-2xl text-lg text-muted">{t("heroSubtitle")}</p>
        <div className="flex gap-3">
          <Link
            href="/blog"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("ctaBlog")}
          </Link>
          <Link
            href="/projects"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("ctaProjects")}
          </Link>
        </div>
      </section>

      {/* 最新文章 */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{t("latestPosts")}</h2>
          <Link href="/blog" className="text-sm text-primary hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {latest.map((p) => (
            <li
              key={p.slug}
              className="rounded-xl border border-border p-5 transition-colors hover:border-primary/40"
            >
              <p className="text-xs text-muted">{p.date}</p>
              <h3 className="mt-1 font-medium">{p.title}</h3>
              <p className="mt-2 text-sm text-muted">{p.excerpt}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 精选项目 */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{t("featuredProjects")}</h2>
          <Link href="/projects" className="text-sm text-primary hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {featured.map((p) => (
            <li
              key={p.slug}
              className="rounded-xl border border-border p-5 transition-colors hover:border-primary/40"
            >
              <h3 className="font-medium">{p.name}</h3>
              <p className="mt-2 text-sm text-muted">{p.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
    </>
  );
}
