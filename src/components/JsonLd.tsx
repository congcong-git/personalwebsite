// 结构化数据（JSON-LD）。
// 用 next/script 注入而非原生 <script>，避免 React 19 在客户端导航（如切换语言）
// 重新渲染该组件时触发 "Encountered a script tag while rendering React component" 告警。
// next/script 走命令式注入，不会在组件树里留下 <script> React 元素，故无告警；
// 该组件始终在服务端组件（layout / 文章页）中渲染，JSON-LD 仍会出现在页面 DOM 供爬虫解析。
import Script from "next/script";

export function JsonLd({ id, data }: { id: string; data: object }) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
