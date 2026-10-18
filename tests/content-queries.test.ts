import { describe, it, expect } from "vitest";
import {
  filterPublishedPosts,
  sortPostsByDate,
  findRelatedPosts,
  getAllPosts,
  getPostBySlug,
  getPostsByTopic,
  getAllSeries,
  getSeries,
  getSeriesById,
  getRelatedPosts,
  type ContentPost,
} from "@/lib/content";

const mockPosts: ContentPost[] = [
  {
    title: "Post 1",
    slug: "post-1",
    permalink: "/posts/post-1",
    summary: "Summary 1",
    date: "2026-03-01T00:00:00Z",
    topic: "agents",
    tags: ["evals", "loops"],
    draft: false,
    readingTime: 5,
    toc: [],
  },
  {
    title: "Post 2",
    slug: "post-2",
    permalink: "/posts/post-2",
    summary: "Summary 2",
    date: "2026-03-10T00:00:00Z",
    topic: "agents",
    tags: ["routing", "loops"],
    draft: false,
    readingTime: 6,
    toc: [],
  },
  {
    title: "Draft Post",
    slug: "draft-post",
    permalink: "/posts/draft-post",
    summary: "Draft summary",
    date: "2026-03-15T00:00:00Z",
    topic: "rag",
    tags: ["evals"],
    draft: true,
    readingTime: 3,
    toc: [],
  },
];

describe("Content Query Logic", () => {
  it("filters published posts when drafts are excluded", () => {
    const published = filterPublishedPosts(mockPosts, false);
    expect(published.length).toBe(2);
    expect(published.some((p) => p.draft)).toBe(false);
  });

  it("includes drafts when requested", () => {
    const all = filterPublishedPosts(mockPosts, true);
    expect(all.length).toBe(3);
  });

  it("sorts posts by date descending", () => {
    const sorted = sortPostsByDate(mockPosts);
    expect(sorted[0].slug).toBe("draft-post");
    expect(sorted[1].slug).toBe("post-2");
    expect(sorted[2].slug).toBe("post-1");
  });

  it("finds related posts by topic and tags excluding self", () => {
    const related = findRelatedPosts(mockPosts[0], mockPosts, 2);
    expect(related.length).toBe(1);
    expect(related[0].slug).toBe("post-2");
  });

  it("calculates related posts score correctly and limits results", () => {
    const mockCandidates: ContentPost[] = [
      {
        title: "Same topic and 2 tags",
        slug: "post-high",
        permalink: "/posts/post-high",
        summary: "High match",
        date: "2026-03-05T00:00:00Z",
        topic: "agents",
        tags: ["evals", "loops"],
        draft: false,
        readingTime: 4,
        toc: [],
      },
      {
        title: "Diff topic and 1 tag",
        slug: "post-low",
        permalink: "/posts/post-low",
        summary: "Low match",
        date: "2026-03-04T00:00:00Z",
        topic: "rag",
        tags: ["evals"],
        draft: false,
        readingTime: 4,
        toc: [],
      },
      {
        title: "No match",
        slug: "post-none",
        permalink: "/posts/post-none",
        summary: "No match",
        date: "2026-03-03T00:00:00Z",
        topic: "tune",
        tags: ["other"],
        draft: false,
        readingTime: 4,
        toc: [],
      },
    ];

    const related = findRelatedPosts(mockPosts[0], [mockPosts[0], ...mockCandidates], 1);
    expect(related.length).toBe(1);
    expect(related[0].slug).toBe("post-high");

    const allRelated = findRelatedPosts(mockPosts[0], [mockPosts[0], ...mockCandidates], 5);
    expect(allRelated.length).toBe(2);
    expect(allRelated.map((p) => p.slug)).toEqual(["post-high", "post-low"]);
  });

  it("handles exports from #site/content gracefully", () => {
    expect(Array.isArray(getAllPosts())).toBe(true);
    expect(Array.isArray(getAllSeries())).toBe(true);
    expect(getAllSeries).toBe(getSeries);
    expect(getPostBySlug("non-existent-slug")).toBeUndefined();
    expect(getPostsByTopic("non-existent-topic")).toEqual([]);
    expect(getSeriesById("non-existent-series")).toBeUndefined();
    const samplePost = {
      title: "Sample",
      slug: "sample",
      permalink: "/posts/sample",
      summary: "Sample",
      date: "2026-03-01T00:00:00Z",
      topic: "non-existent-topic",
      tags: [] as string[],
      draft: false,
      readingTime: 1,
      toc: [],
      body: "",
      metadata: { readingTime: 1, wordCount: 100 },
    };
    expect(getRelatedPosts(samplePost)).toEqual([]);
  });
});
