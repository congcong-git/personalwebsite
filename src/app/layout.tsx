import type { ReactNode } from "react";
import "./globals.css";

// 根布局仅做透传，html/body 由 [locale] 布局根据语言渲染（next-intl 路由约定）
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
