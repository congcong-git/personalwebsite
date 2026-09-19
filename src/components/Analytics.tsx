"use client";

import Script from "next/script";

// 51.la 统计（国内可访问、免服务器，全局注入到 [locale] 布局）
// 环境变量未配置时返回 null，不阻塞页面；配置后即自动启用
const LA_ID = process.env.NEXT_PUBLIC_51LA_ID;
const LA_CK = process.env.NEXT_PUBLIC_51LA_CK;

export function Analytics() {
  if (!LA_ID) return null;
  return (
    <Script
      id="LA_COLLECT"
      src="//sdk.51.la/js-sdk-pro.min.js"
      charset="UTF-8"
      strategy="afterInteractive"
      onLoad={() => {
        const w = window as unknown as {
          LA?: { init?: (o: { id: string; ck?: string }) => void };
        };
        w.LA?.init?.({ id: LA_ID, ...(LA_CK ? { ck: LA_CK } : {}) });
      }}
    />
  );
}
