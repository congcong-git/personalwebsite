"use client";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { LocaleSwitch } from "./LocaleSwitch";
import { ThemeToggle } from "./ThemeToggle";
import { Search } from "./Search";
import type { SearchDoc } from "@/lib/search";

// 顶部导航：品牌字标 + 板块入口（当前路由高亮）+ 搜索 + 语言/主题切换
// brand 来自后台 settings 集合（默认 "xuniw"）
export function Header({ searchDocs, brand }: { searchDocs: SearchDoc[]; brand: string }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const items = [
    { href: "/", label: t("home") },
    { href: "/blog", label: t("blog") },
    { href: "/projects", label: t("projects") },
    { href: "/about", label: t("about") },
    { href: "/links", label: t("links") },
  ] as const;

  const isActive = (href: string) =>
    href === "/"
      ? pathname === `/${locale}`
      : pathname.startsWith(`/${locale}${href}`);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] text-xs font-bold text-white shadow-[0_4px_12px_var(--glow)]">
            {brand.charAt(0)}
          </span>
          <span className="text-base">
            <span className="gradient-text font-bold">{brand}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-0.5">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`nav-link rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive(it.href) ? "nav-link-active" : ""
              }`}
            >
              {it.label}
            </Link>
          ))}
          <Search docs={searchDocs} />
          <span className="mx-1 h-5 w-px bg-border" />
          <LocaleSwitch />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
