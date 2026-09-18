import { getTranslations, setRequestLocale } from "next-intl/server";
import { getProfile } from "@/lib/content";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const profile = await getProfile();

  return (
    <div className="flex flex-col gap-12">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="max-w-2xl leading-8 text-muted">{t("bio")}</p>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("skills")}</h2>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((s) => (
            <span
              key={s}
              className="rounded-full border border-border px-3 py-1 text-sm text-foreground/80"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("timeline")}</h2>
        <ol className="flex flex-col gap-4 border-l border-border pl-5">
          {profile.timeline.map((item) => (
            <li key={item.year} className="relative">
              <span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="font-medium">
                {item.year} · {item.title}
              </p>
              <p className="text-sm text-muted">{item.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <a
        href={profile.resumeUrl || "/resume.pdf"}
        className="w-fit rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        {t("resume")}
      </a>

      {profile.wechat?.qr && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("wechat")}</h2>
          <div className="flex flex-col gap-6 rounded-2xl border border-border p-6 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.wechat.qr}
              alt={profile.wechat.name ?? t("wechat")}
              width={128}
              height={128}
              className="h-32 w-32 shrink-0 rounded-xl border border-border bg-white object-contain p-1"
            />
            <div className="flex flex-col gap-2">
              {profile.wechat.name && <p className="font-medium">{profile.wechat.name}</p>}
              <p className="text-sm leading-7 text-muted">
                {profile.wechat.desc || t("wechatDesc")}
              </p>
              <p className="text-xs text-muted">{t("wechatHint")}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
