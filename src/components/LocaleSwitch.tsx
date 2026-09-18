"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// 语言切换：保留当前路径，仅替换 locale 前缀
export function LocaleSwitch() {
  const locale = useLocale();
  const t = useTranslations("Lang");
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: string) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="flex items-center gap-1 text-sm" aria-label={t("switch")}>
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchTo(loc)}
          className={`rounded px-2 py-1 transition-colors ${
            loc === locale
              ? "font-semibold text-primary"
              : "text-foreground/60 hover:text-foreground"
          }`}
          aria-current={loc === locale}
        >
          {loc === "zh" ? t("zh") : t("en")}
        </button>
      ))}
    </div>
  );
}
