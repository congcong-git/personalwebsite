import type { MetadataRoute } from "next";
import { getPosts, getProjects } from "@/lib/content";
import { routing } from "@/i18n/routing";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const STATIC_PATHS = ["", "about", "projects", "blog", "links"];

// 静态导出（output: export）要求显式声明可静态化
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静态路由：每个 locale 一份
  const staticEntries: MetadataRoute.Sitemap = routing.locales.flatMap((loc) =>
    STATIC_PATHS.map((p) => ({
      url: `${SITE}/${loc}${p ? `/${p}` : ""}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    }))
  );

  // 博客：按文章自身语言生成对应 locale 的 URL
  const posts = await getPosts();
  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE}/${post.lang}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // 项目：数据不分语言，每个 locale 都暴露
  const projects = await getProjects();
  const projectEntries: MetadataRoute.Sitemap = routing.locales.flatMap((loc) =>
    projects.map((proj) => ({
      url: `${SITE}/${loc}/projects/${proj.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  );

  return [...staticEntries, ...postEntries, ...projectEntries];
}
