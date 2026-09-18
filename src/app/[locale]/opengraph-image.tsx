import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";
import { getSettings } from "@/lib/content";

// 语言级默认 OG 图（1200x630）：SSG 阶段生成静态 PNG，供各语言页 openGraph 兜底
// 放在 [locale] 下，匹配 next-intl middleware 对无扩展名路径的语言前缀重写（/opengraph-image -> /zh/opengraph-image）
export const alt = "xuniw 的技术站";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 静态导出（output: export）要求：动态段下需显式声明可静态化 + 枚举参数
export const dynamic = "force-static";
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: { params: { locale: string } }) {
  // 站点名来自后台 settings（默认 "xuniw 的技术站"），不再写死
  const settings = await getSettings();
  const siteName = settings.siteName || "xuniw 的技术站";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: "-1px" }}>
          {siteName}
        </div>
        <div style={{ fontSize: 34, opacity: 0.85, marginTop: 24 }}>
          自动化 · 机器人 · 全栈
        </div>
      </div>
    ),
    { ...size }
  );
}
