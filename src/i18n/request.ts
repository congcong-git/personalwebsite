import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";

// 每个请求根据 URL 中的 locale 加载对应的消息文件
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // 非法 locale 回退到默认语言
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
