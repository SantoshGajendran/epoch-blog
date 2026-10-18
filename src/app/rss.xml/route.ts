import { getAllPosts } from "@/lib/content";
import { generateRssXml } from "@/lib/content/rss";

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
