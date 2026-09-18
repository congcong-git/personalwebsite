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

      <header className="flex flex-col gap-3 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-muted">{project.summary}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-border px-3 py-1 text-foreground/70">
            {project.role}
          </span>
          {project.tech.map((tg) => (
            <span
              key={tg}
              className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-foreground/60 dark:bg-white/10"
            >
              {tg}
            </span>
          ))}
        </div>
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("visit")}
          </a>
        )}
      </header>

      <p className="text-muted">{project.highlight}</p>

      {project.body && <Markdown content={project.body} />}
    </article>
  );
}
