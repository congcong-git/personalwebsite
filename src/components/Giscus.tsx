"use client";

import { useEffect, useRef } from "react";

// Giscus 评论（按官方方式在客户端动态注入 script）
// 环境变量未配置时静默不渲染，不阻塞页面；配置后即自动启用
const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO;
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY || "Announcements";
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
const LANG = process.env.NEXT_PUBLIC_GISCUS_LANG || "zh-CN";

export function Giscus() {
  const configured = Boolean(REPO && REPO_ID && CATEGORY_ID);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!configured || !containerRef.current) return;
    // 避免热更新 / 重复渲染时重复注入
    if (containerRef.current.querySelector("script")) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", REPO as string);
    script.setAttribute("data-repo-id", REPO_ID as string);
    script.setAttribute("data-category", CATEGORY);
    script.setAttribute("data-category-id", CATEGORY_ID as string);
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "bottom");
    // 跟随系统/浏览器配色，无需与 next-themes 强耦合
    script.setAttribute("data-theme", "preferred_color_scheme");
    script.setAttribute("data-lang", LANG);
    containerRef.current.appendChild(script);
  }, [configured]);

  if (!configured) return null;
  return <div ref={containerRef} className="mt-12 giscus" />;
}
