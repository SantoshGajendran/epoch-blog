import type { MetadataRoute } from "next";
import { getAllPosts, getAllSeries } from "@/lib/content";
import { siteConfig } from "@config/index";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const series = getAllSeries();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteConfig.url}${post.permalink}`,
    lastModified: new Date(post.updated || post.date),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const seriesRoutes: MetadataRoute.Sitemap = series.map((s) => ({
    url: `${siteConfig.url}${s.permalink}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes, ...seriesRoutes];
}
