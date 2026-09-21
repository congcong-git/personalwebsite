import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllProjectSlugs, getProject, localeText } from "@/lib/content";
import Markdown from "@/components/Markdown";

type Params = { locale: string; slug: string };

export async function generateStaticParams() {
  const slugs = await getAllProjectSlugs();
  return slugs.map((slug) => ({ locale: "zh", slug })).concat(
    slugs.map((slug) => ({ locale: "en", slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return {
    title: localeText(project.name, locale as Locale),
    description: localeText(project.summary, locale as Locale),
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Nav");

  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <article className="flex flex-col gap-8">
      <Link href="/projects" className="text-sm text-primary hover:underline">
        ← {t("projects")}
      </Link>

      <header className="card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{localeText(project.name, locale as Locale)}</h1>
          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              {t("visit")}
            </a>
          )}
        </div>
        <p className="text-muted">{localeText(project.summary, locale as Locale)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag-pill tag-pill-brand">{localeText(project.role, locale as Locale)}</span>
          {project.tech.map((tg) => (
            <span key={tg} className="tag-pill">
              {tg}
            </span>
          ))}
        </div>
      </header>

      <p className="text-muted">{localeText(project.highlight, locale as Locale)}</p>

      {project.body && <Markdown content={localeText(project.body, locale as Locale)} />}
    </article>
  );
}
