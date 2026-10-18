import { describe, it, expect } from "vitest";
import { GET } from "@/app/rss.xml/route";
import { generateRssXml } from "@/lib/content/rss";
import sitemap from "@/app/sitemap";
import Image, { size, contentType } from "@/app/posts/[slug]/opengraph-image";
import { siteConfig } from "@config/index";

const mockPosts = [
  {
    title: "Test Post",
    slug: "test-post",
    permalink: "/posts/test-post",
    summary: "A test post summary",
    date: "2026-03-01T00:00:00.000Z",
    draft: false,
  },
  {
    title: "Draft Post",
    slug: "draft-post",
    permalink: "/posts/draft-post",
    summary: "A draft post summary",
    date: "2026-03-02T00:00:00.000Z",
    draft: true,
  },
];

describe("SEO & Feed Generation", () => {
  describe("RSS 2.0 Feed Generator", () => {
    it("generates valid RSS 2.0 XML string", () => {
      const xml = generateRssXml(mockPosts);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
      expect(xml).toContain(`<title>${siteConfig.name}</title>`);
      expect(xml).toContain(`<link>${siteConfig.url}</link>`);
      expect(xml).toContain(`<description>${siteConfig.description}</description>`);
      expect(xml).toContain("Test Post");
      expect(xml).toContain(`${siteConfig.url}/posts/test-post`);
      expect(xml).toContain("A test post summary");
    });

    it("filters out draft posts from RSS items", () => {
      const xml = generateRssXml(mockPosts);
      expect(xml).toContain("Test Post");
      expect(xml).not.toContain("Draft Post");
      expect(xml).not.toContain("/posts/draft-post");
    });

    it("returns valid XML Response with proper cache headers from GET handler", async () => {
      const response = await GET();
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
      expect(response.headers.get("Cache-Control")).toContain("public");
      expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
      const text = await response.text();
      expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(text).toContain("<rss version=\"2.0\"");
    });
  });

  describe("Sitemap Generator", () => {
    it("generates sitemap with static root, posts, and series", () => {
      const routes = sitemap();
      expect(Array.isArray(routes)).toBe(true);

      // Check root static route
      const rootRoute = routes.find((r) => r.url === siteConfig.url);
      expect(rootRoute).toBeDefined();
      expect(rootRoute?.priority).toBe(1);
      expect(rootRoute?.changeFrequency).toBe("daily");

      // Check that all post routes include siteConfig.url prefix and have priority 0.8
      const postRoutes = routes.filter((r) => r.url.includes("/posts/"));
      postRoutes.forEach((route) => {
        expect(route.url.startsWith(siteConfig.url)).toBe(true);
        expect(route.priority).toBe(0.8);
        expect(route.changeFrequency).toBe("weekly");
        expect(route.lastModified).toBeDefined();
      });

      // Check that series routes include siteConfig.url prefix and have priority 0.6
      const seriesRoutes = routes.filter((r) => r.url.includes("/series/"));
      seriesRoutes.forEach((route) => {
        expect(route.url.startsWith(siteConfig.url)).toBe(true);
        expect(route.priority).toBe(0.6);
        expect(route.changeFrequency).toBe("monthly");
        expect(route.lastModified).toBeDefined();
      });
    });
  });

  describe("OpenGraph Image Generator", () => {
    it("exports standard 1200x630 dimensions and image/png content type", () => {
      expect(size).toEqual({ width: 1200, height: 630 });
      expect(contentType).toBe("image/png");
    });

    it("renders ImageResponse for a post slug", async () => {
      const response = await Image({
        params: Promise.resolve({ slug: "building-reliable-agent-loops" }),
      });
      expect(response).toBeDefined();
      expect(response.headers.get("content-type")).toContain("image/png");
    });

    it("renders fallback ImageResponse when post slug does not exist", async () => {
      const response = await Image({
        params: Promise.resolve({ slug: "non-existent-post" }),
      });
      expect(response).toBeDefined();
      expect(response.headers.get("content-type")).toContain("image/png");
    });
  });
});
