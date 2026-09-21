import type { ReactNode } from "react";
import "./globals.css";
import { getLocale } from "next-intl/server";

// 根布局持有 <html>/<head>/<body>。主题防闪烁脚本放在这里：根布局不含 [locale]
// 动态段，切语言进行客户端导航时不会重渲染，因此脚本只渲染一次（首屏前执行防闪烁），
// 不会再像放在 [locale] 布局里那样被当成 React 元素在客户端重渲染而触发
// "Encountered a script tag while rendering React component" 告警。
export default async function RootLayout({ children }: { children: ReactNode }) {
  let locale = "zh-CN";
  try {
    locale = await getLocale();
  } catch {
    // 非 locale 路由（如全局 not-found）下回退默认值
  }
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* 提前与 Giscus 建立连接，缩短评论框外部脚本/iframe 的加载握手时间 */}
        <link rel="preconnect" href="https://giscus.app" crossOrigin="anonymous" />
        {/* 防主题闪烁：首屏前同步执行；根布局内仅渲染一次，切语言不重渲染、无告警 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var d;if(t==='light')d=false;else if(t==='dark')d=true;else if(t==='system')d=window.matchMedia('(prefers-color-scheme: dark)').matches;else d=true;if(d)document.documentElement.classList.add('dark');}catch(e){}})();",
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
