import { siteConfig } from "@config/index";

export interface MinimalPost {
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
