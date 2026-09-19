"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

// Giscus 评论（按官方方式在客户端动态注入 script）
// 环境变量未配置时静默不渲染，不阻塞页面；配置后即自动启用
const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO;
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY || "Announcements";
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
const LANG = process.env.NEXT_PUBLIC_GISCUS_LANG || "zh-CN";

// Giscus 内置主题：跟随站点 next-themes 的实际明暗，而非系统配色
function giscusTheme(resolved?: string) {
  return resolved === "dark" ? "dark" : "light";
}

export function Giscus() {
  const configured = Boolean(REPO && REPO_ID && CATEGORY_ID);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);

  // 注入 script（仅一次），并在 iframe 注入后移除骨架占位
  useEffect(() => {
    if (!configured || !containerRef.current) return;
    const container = containerRef.current;
    // 避免热更新 / 重复渲染时重复注入
    if (container.querySelector("script")) return;
    // 已存在 iframe（如切换语言重渲染）直接标记为就绪
    if (container.querySelector("iframe.giscus-frame")) {
      setReady(true);
      return;
    }

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
    // 初始化即按站点当前主题着色（含暗色），避免默认白底
    script.setAttribute("data-theme", giscusTheme(resolvedTheme));
    script.setAttribute("data-lang", LANG);

    // 监听 iframe 注入，移除「评论加载中」骨架
    const observer = new MutationObserver(() => {
      if (container.querySelector("iframe.giscus-frame")) {
        setReady(true);
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    container.appendChild(script);
    return () => observer.disconnect();
  }, [configured]);

  // 站点主题切换后，实时更新已加载的 Giscus iframe 配色
  useEffect(() => {
    if (!configured) return;
    const iframe = document.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
    iframe?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: giscusTheme(resolvedTheme) } } },
      "https://giscus.app",
    );
  }, [configured, resolvedTheme]);

  if (!configured) return null;
  return (
    <div className="mt-12">
      {!ready && (
        <div className="rounded-xl border border-border bg-surface/40 p-6 text-sm text-muted">
          评论加载中…
        </div>
      )}
      <div ref={containerRef} className="giscus" />
    </div>
  );
}
