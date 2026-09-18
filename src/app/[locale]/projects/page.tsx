import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProjects } from "@/lib/content";

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
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("projects")}</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/projects/${p.slug}`}
              className="block h-full rounded-xl border border-border p-5 transition-colors hover:border-primary/40"
            >
              <h2 className="font-semibold">{p.name}</h2>
              <p className="mt-2 text-sm text-muted">{p.summary}</p>
              <p className="mt-3 text-xs text-muted">{p.highlight}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.tech.map((tg) => (
                  <span
                    key={tg}
                    className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-foreground/60 dark:bg-white/10"
                  >
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
