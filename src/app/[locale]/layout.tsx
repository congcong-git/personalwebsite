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
import { getPosts } from "@/lib/content";
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
  const siteName = "xuniw 的技术站";
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: t("title"), template: `%s · ${siteName}` },
    description: t("description"),
    alternates: {
      languages: { "zh-CN": "/zh", en: "/en" },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "zh_CN",
      url: `/${locale}`,
      siteName,
      title: t("title"),
      description: t("description"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
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
  const searchDocs = buildSearchDocs(posts, locale as Locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <Header searchDocs={searchDocs} />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-5xl px-4 py-10">
                {children}
              </div>
            </main>
            <Footer />
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
