import { useTranslations } from "next-intl";

// 页脚：版权 + 社交入口 + 构建信息
// 注：lucide-react 新版移除了品牌图标（Github 等），故社交图标内联 SVG，避免依赖缺失
export function Footer() {
  const t = useTranslations("Footer");
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

  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-sm text-muted sm:flex-row sm:justify-between">
        <p>{t("copyright").replace("2026", String(year))}</p>
        <div className="flex items-center gap-3">
          {socials.map(({ href, label, icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              aria-label={label}
              className="text-muted transition-colors hover:text-foreground"
            >
              {icon}
            </a>
          ))}
        </div>
        <p className="text-xs">{t("builtWith")}</p>
      </div>
    </footer>
  );
}
