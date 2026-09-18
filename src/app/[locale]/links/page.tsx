import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLinks } from "@/lib/content";

export default async function LinksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Nav");
  const links = await getLinks();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("links")}</h1>
      <ul className="flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.name}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card card-interactive group flex items-center justify-between gap-4 p-4"
            >
              <div className="flex flex-col gap-1">
                <p className="font-medium">{l.name}</p>
                <p className="text-sm text-muted">{l.desc}</p>
              </div>
              <span className="shrink-0 text-subtle transition-colors group-hover:text-primary">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
