import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// 页脚：品牌 + 导航 + 社交入口
// 注：lucide-react 新版移除了品牌图标（Github 等），故社交图标内联 SVG，避免依赖缺失
export function Footer() {
  const t = useTranslations("Footer");
  const tn = useTranslations("Nav");
  const year = new Date().getFullYear();

  const socials = [
    {
      href: "https://github.com/xuniw",
      label: "GitHub",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
        </svg>
      ),
    },
    {
      href: "mailto:hello@xuniw.dev",
      label: "Email",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
      ),
    },
  ];

  const navItems = [
    { href: "/", label: tn("home") },
    { href: "/blog", label: tn("blog") },
    { href: "/projects", label: tn("projects") },
    { href: "/about", label: tn("about") },
    { href: "/links", label: tn("links") },
  ];

  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:grid-cols-3">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] text-xs font-bold text-white shadow-[0_4px_12px_var(--glow)]">
              x
            </span>
            <span className="gradient-text text-base font-bold">xuniw</span>
          </div>
          <p className="max-w-xs text-sm leading-7 text-muted">
            {t("bio")}
          </p>
          <div className="flex items-center gap-3">
            {socials.map(({ href, label, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">{tn("home")}</p>
          {navItems.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="text-sm text-muted transition-colors hover:text-primary"
            >
              {it.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3 text-sm text-muted">
          <p className="font-semibold text-foreground">{t("builtWith")}</p>
          <p className="leading-7">{t("stackNote")}</p>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-subtle">
        {t("copyright").replace("2026", String(year))}
      </div>
    </footer>
  );
}
