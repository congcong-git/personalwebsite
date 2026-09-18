import { defineRouting } from "next-intl/routing";

// 站点支持的语言，zh 为主、默认
export const routing = defineRouting({
  locales: ["zh", "en"],
  defaultLocale: "zh",
  // 默认语言是否带前缀：true 表示 /zh 也显式带前缀，结构更清晰
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
