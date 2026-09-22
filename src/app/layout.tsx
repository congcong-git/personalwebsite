import type { ReactNode } from "react";
import "./globals.css";

// 根布局持有 <html>/<head>/<body>。主题防闪烁脚本放在这里：根布局不含 [locale]
// 动态段，切语言进行客户端导航时不会重渲染，因此脚本只渲染一次（首屏前执行防闪烁），
// 不会再像放在 [locale] 布局里那样被当成 React 元素在客户端重渲染而触发
// "Encountered a script tag while rendering React component" 告警。
//
// 注意：根布局在 [locale] 之上，取不到当前 locale 参数，因此不能用 getLocale() 这类
// 动态 API——否则整站会被标记为动态渲染，output:export 静态导出会直接报错。
// <html lang> 用静态默认值，真正的 locale 由 [locale] 布局里的 LocaleLang 客户端组件同步。
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
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
