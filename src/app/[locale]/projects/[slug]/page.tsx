import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllProjectSlugs, getProject } from "@/lib/content";
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
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return { title: project.name, description: project.summary };
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
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
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
        <p className="text-muted">{project.summary}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag-pill tag-pill-brand">{project.role}</span>
          {project.tech.map((tg) => (
            <span key={tg} className="tag-pill">
              {tg}
            </span>
          ))}
        </div>
      </header>

      <p className="text-muted">{project.highlight}</p>

      {project.body && <Markdown content={project.body} />}
    </article>
  );
}
