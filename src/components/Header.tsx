import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitch } from "./LocaleSwitch";
import { ThemeToggle } from "./ThemeToggle";
import { Search } from "./Search";
import type { SearchDoc } from "@/lib/search";

// 顶部导航：站点名 + 板块入口 + 搜索 + 语言/主题切换
export function Header({ searchDocs }: { searchDocs: SearchDoc[] }) {
  const t = useTranslations("Nav");
  const items = [
    { href: "/", label: t("home") },
    { href: "/blog", label: t("blog") },
    { href: "/projects", label: t("projects") },
    { href: "/about", label: t("about") },
    { href: "/links", label: t("links") },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          xuniw
        </Link>
        <nav className="flex items-center gap-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
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
