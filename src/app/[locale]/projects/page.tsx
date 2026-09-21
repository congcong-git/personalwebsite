import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getProjects, localeText } from "@/lib/content";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Nav");

  const projects = await getProjects();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("projects")}</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/projects/${p.slug}`}
              className="card card-interactive block h-full p-5"
            >
              <h2 className="font-semibold leading-snug">{localeText(p.name, locale as Locale)}</h2>
              <p className="mt-2 text-sm leading-7 text-muted">{localeText(p.summary, locale as Locale)}</p>
              <p className="mt-3 text-xs leading-6 text-subtle">{localeText(p.highlight, locale as Locale)}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.tech.map((tg) => (
                  <span key={tg} className="tag-pill">
                    {tg}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
