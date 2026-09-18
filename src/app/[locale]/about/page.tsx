import { getTranslations, setRequestLocale } from "next-intl/server";
import { getProfile, getSettings } from "@/lib/content";
import type { Locale } from "@/i18n/routing";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const profile = await getProfile();
  // 关于页顶部简介来自后台 settings（默认回退本地值），不再写死在 i18n
  const settings = await getSettings();

  return (
    <div className="flex flex-col gap-12">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="max-w-2xl leading-8 text-muted">{settings.bio}</p>

      <section className="flex flex-col gap-4">
        <h2 className="section-title">{t("skills")}</h2>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((s) => (
            <span key={s} className="tag-pill tag-pill-brand">
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="section-title">{t("timeline")}</h2>
        <ol className="flex flex-col gap-3">
          {profile.timeline.map((item) => (
            <li key={item.year} className="card flex flex-col gap-1 p-4">
              <span className="tag-pill tag-pill-brand w-fit">{item.year}</span>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm leading-7 text-muted">{item.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <a href={profile.resumeUrl || "/resume.pdf"} className="btn btn-primary w-fit">
        {t("resume")}
      </a>

      {profile.wechat?.qr && (
        <section className="flex flex-col gap-4">
          <h2 className="section-title">{t("wechat")}</h2>
          <div className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
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
