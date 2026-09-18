import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

// 静态导出只在「部署构建」时开启：
//   - 本地/CI 默认构建：普通 Next 应用，管理端 API、中间件等动态能力完整可用
//   - BUILD_STATIC_EXPORT=true：产出 out/，用于 EdgeOne Pages（其要求 Next.js 为静态导出模式）
// 见 https://cloud.tencent.com/document/product/1552/127389 与 EdgeOne 框架指南
const isStaticExport = process.env.BUILD_STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export",
        // 静态导出下没有服务端图片优化器，必须关闭
        images: { unoptimized: true },
        // 输出 /zh/index.html 这类目录结构，提高静态托管兼容性
        trailingSlash: true,
      }
    : {}),
};

export default withNextIntl(nextConfig);
