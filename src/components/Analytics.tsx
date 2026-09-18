import Script from "next/script";

// Umami 隐私友好统计（全局注入，放在 [locale] 布局）
// 环境变量未配置时返回 null，不阻塞页面；配置后即自动启用
const UMAMI_URL = process.env.NEXT_PUBLIC_UMAMI_URL;
const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_ID;

export function Analytics() {
  if (!UMAMI_URL || !UMAMI_ID) return null;
  return (
    <Script
      src={UMAMI_URL}
      data-website-id={UMAMI_ID}
      strategy="afterInteractive"
    />
  );
}
