import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
import { getPosts, getSettings } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { buildSearchDocs } from "@/lib/search";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const settings = await getSettings();
  // SEO 文案优先取后台 settings.seo[locale]，缺省回退 i18n
  const seo = settings.seo[locale as Locale] ?? { title: "", description: "" };
  const siteName = settings.siteName || "xuniw 的技术站";
  const title = seo.title || t("title");
  const description = seo.description || t("description");
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: title, template: `%s · ${siteName}` },
    description,
    alternates: {
      languages: { "zh-CN": "/zh", en: "/en" },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "zh_CN",
      url: `/${locale}`,
      siteName,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const posts = await getPosts(locale as Locale);
  const settings = await getSettings();
  const searchDocs = buildSearchDocs(posts, locale as Locale);

  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteName || "xuniw 的技术站",
    url: SITE,
    inLanguage: locale,
  };
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: settings.brand || "xuniw",
    url: SITE,
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* 提前与 Giscus 建立连接，缩短评论框外部脚本/iframe 的加载握手时间 */}
        <link rel="preconnect" href="https://giscus.app" crossOrigin="anonymous" />
      </head>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <Header searchDocs={searchDocs} brand={settings.brand} />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-5xl px-4 py-10">
                {children}
              </div>
            </main>
            <Footer
              brand={settings.brand}
              footerNote={settings.footerNote}
              socials={settings.socials}
            />
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
