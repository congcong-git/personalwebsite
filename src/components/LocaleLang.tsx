"use client";
import { useEffect } from "react";
import { useLocale } from "next-intl";

// 根布局的 <html lang> 使用静态默认值（根布局在 [locale] 之上、取不到 locale 参数，
// 为避免使用 getLocale() 这类动态 API 破坏 output:export 静态导出）。
// 这里在客户端把 lang 同步为当前 locale，保证语义正确（屏幕阅读器 / SEO 友好）。
export function LocaleLang() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
