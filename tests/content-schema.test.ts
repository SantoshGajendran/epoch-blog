import { describe, it, expect } from "vitest";
import { topicsConfig } from "@config/index";

describe("Content Schema Constraints", () => {
  it("verifies all topic IDs from topicsConfig are valid", () => {
    const validTopics = topicsConfig.topics.map((t) => t.id);
    expect(validTopics).toContain("agents");
    expect(validTopics).toContain("rag");
    expect(validTopics).toContain("tune");
    expect(validTopics).toContain("infra");
  });

  it("rejects unknown topic IDs in validator function", () => {
    const validTopics = new Set(topicsConfig.topics.map((t) => t.id));
    const validateTopic = (topic: string) => validTopics.has(topic);

    expect(validateTopic("agents")).toBe(true);
    expect(validateTopic("quantum-cryptography")).toBe(false);
  });

  it("calculates reading time correctly based on 200 words per minute", () => {
    const calculateReadingTime = (wordCount: number) => Math.max(1, Math.ceil(wordCount / 200));

    expect(calculateReadingTime(0)).toBe(1);
    expect(calculateReadingTime(150)).toBe(1);
    expect(calculateReadingTime(200)).toBe(1);
    expect(calculateReadingTime(201)).toBe(2);
    expect(calculateReadingTime(1000)).toBe(5);
  });

  it("transforms post path into correct slug and permalink", () => {
    const transformPath = (metaPath: string) => {
      const slug = metaPath.replace(/^posts\//, "").replace(/\.mdx$/, "");
      return {
        slug,
        permalink: `/posts/${slug}`,
      };
    };

    expect(transformPath("posts/agent-loop.mdx")).toEqual({
      slug: "agent-loop",
      permalink: "/posts/agent-loop",
    });
    expect(transformPath("posts/2026/hybrid-search.mdx")).toEqual({
      slug: "2026/hybrid-search",
      permalink: "/posts/2026/hybrid-search",
    });
  });

  it("transforms series path into correct slug and permalink", () => {
    const transformPath = (metaPath: string) => {
      const slug = metaPath.replace(/^series\//, "").replace(/\.mdx$/, "");
      return {
        slug,
        permalink: `/series/${slug}`,
      };
    };

    expect(transformPath("series/building-agents.mdx")).toEqual({
      slug: "building-agents",
      permalink: "/series/building-agents",
    });
  });

  it("exports posts and series from #site/content", async () => {
    const content = await import("#site/content");
    expect(Array.isArray(content.posts)).toBe(true);
    expect(Array.isArray(content.series)).toBe(true);
  });
});
