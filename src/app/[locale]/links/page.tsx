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
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("links")}</h1>
      <ul className="flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.name}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-border p-4 transition-colors hover:border-primary/40"
            >
              <p className="font-medium">{l.name}</p>
              <p className="text-sm text-muted">{l.desc}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
