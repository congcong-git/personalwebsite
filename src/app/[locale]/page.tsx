import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPosts, getProjects, getSettings, localeText } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { JsonLd } from "@/components/JsonLd";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  // Hero 文案优先取后台 settings，留空回退 i18n 文案
  const settings = await getSettings();
  const heroTag = localeText(settings.heroTag, locale as Locale) || t("heroTag");
  const heroTitle = localeText(settings.heroTitle, locale as Locale) || t("heroTitle");
  const heroAccent =
    localeText(settings.heroTitleAccent, locale as Locale) || t("heroTitleAccent");
  const heroSubtitle =
    localeText(settings.heroSubtitle, locale as Locale) || t("heroSubtitle");

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
      <JsonLd id="jsonld-website" data={jsonLd} />
      <JsonLd id="jsonld-person" data={personLd} />
      <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="hero-aura flex flex-col items-start gap-6 rounded-3xl px-6 py-16 sm:px-10">
        <span className="tag-pill-brand">{heroTag}</span>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          {heroTitle}
          <span className="gradient-text"> {heroAccent}</span>
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">
          {heroSubtitle}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/blog" className="btn btn-primary">
            {t("ctaBlog")}
          </Link>
          <Link href="/projects" className="btn btn-ghost">
            {t("ctaProjects")}
          </Link>
        </div>
      </section>

      {/* 最新文章 */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="section-title">{t("latestPosts")}</h2>
          <Link href="/blog" className="link-brand text-sm">
            {t("viewAll")}
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {latest.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="card card-interactive block h-full p-5">
                <p className="text-xs text-subtle">{p.date}</p>
                <h3 className="mt-1.5 font-semibold leading-snug">{p.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">
                  {p.excerpt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 精选项目 */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="section-title">{t("featuredProjects")}</h2>
          <Link href="/projects" className="link-brand text-sm">
            {t("viewAll")}
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {featured.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/projects/${p.slug}`}
                className="card card-interactive block h-full p-5"
              >
                <h3 className="font-semibold leading-snug">{localeText(p.name, locale as Locale)}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">
                  {localeText(p.summary, locale as Locale)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
    </>
  );
}
