import { getPosts } from "@/lib/content";

// RSS 2.0 订阅源：聚合全部文章（按语言区分），SSG 阶段静态生成
export const dynamic = "force-static";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function GET() {
  const posts = (await getPosts())
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const items = posts
    .map((p) => {
      const url = `${SITE}/${p.lang}/blog/${p.slug}`;
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <category>${p.lang}</category>
      <description>${escapeXml(p.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>xuniw 的技术站</title>
    <link>${SITE}</link>
    <description>个人技术博客与项目展示（自动化 / 机器人 / 全栈）</description>
    <language>zh-CN</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}

function escapeXml(s: string): string {
  return String(s).replace(/[<>&'"]/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === "&"
          ? "&amp;"
          : c === "'"
            ? "&apos;"
            : "&quot;"
  );
}
