import { getAllPosts } from "@/lib/content";
import { siteConfig } from "@config/index";

interface MinimalPost {
  title: string;
  slug: string;
  permalink: string;
  summary: string;
  date: string;
  draft: boolean;
}

export function generateRssXml(posts: MinimalPost[]): string {
  const items = posts
    .filter((post) => !post.draft)
    .map(
      (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteConfig.url}${post.permalink}</link>
      <guid isPermaLink="true">${siteConfig.url}${post.permalink}</guid>
      <description><![CDATA[${post.summary}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteConfig.name}</title>
    <link>${siteConfig.url}</link>
    <description>${siteConfig.description}</description>
    <language>en-us</language>
    <atom:link href="${siteConfig.url}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

export async function GET() {
  const posts = getAllPosts();
  const xml = generateRssXml(posts);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
