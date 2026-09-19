import Script from "next/script";

// 结构化数据（JSON-LD）。
// 用 next/script 渲染，避免 React 19 在客户端渲染原生 <script> 时抛出
// "Encountered a script tag while rendering React component" 告警。
export function JsonLd({ id, data }: { id: string; data: object }) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
