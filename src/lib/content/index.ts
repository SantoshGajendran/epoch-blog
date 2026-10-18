import { posts, series, type Post, type Series } from "#site/content";

export type { Post, Series };

export type ContentPost = Omit<Post, "body" | "metadata"> & {
  body?: Post["body"];
  metadata?: Post["metadata"];
};

export function filterPublishedPosts<T extends { draft: boolean }>(
  items: T[],
  includeDrafts = process.env.NODE_ENV === "development"
): T[] {
  if (includeDrafts) return items;
  return items.filter((item) => !item.draft);
}

export function sortPostsByDate<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getAllPosts(options?: { includeDrafts?: boolean }): Post[] {
  const filtered = filterPublishedPosts(posts, options?.includeDrafts);
  return sortPostsByDate(filtered);
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getPostsByTopic(topicId: string, options?: { includeDrafts?: boolean }): Post[] {
  return getAllPosts(options).filter((p) => p.topic === topicId);
}

export function getAllSeries(): Series[] {
  return [...series].sort((a, b) => a.order - b.order);
}

export const getSeries = getAllSeries;

export function getSeriesById(
  seriesId: string
): { series: Series; posts: Post[] } | undefined {
  const currentSeries = series.find((s) => s.id === seriesId);
  if (!currentSeries) return undefined;

  const seriesPosts = getAllPosts().filter((p) => p.series?.id === seriesId);
  seriesPosts.sort((a, b) => (a.series?.order || 0) - (b.series?.order || 0));

  return {
    series: currentSeries,
    posts: seriesPosts,
  };
}

export function findRelatedPosts<
  T extends { slug: string; topic: string; tags: string[]; draft?: boolean }
>(currentPost: T, allPosts: T[], limit = 3): T[] {
  return allPosts
    .filter((post) => post.slug !== currentPost.slug && !post.draft)
    .map((post) => {
      let score = 0;
      if (post.topic === currentPost.topic) score += 3;
      const sharedTags = post.tags.filter((tag) => currentPost.tags.includes(tag));
      score += sharedTags.length * 2;
      return { post, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.post);
}

export function getRelatedPosts(post: Post, limit = 3): Post[] {
  return findRelatedPosts(post, getAllPosts(), limit);
}
