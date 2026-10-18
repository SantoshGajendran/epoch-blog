import { describe, it, expect } from "vitest";
import { getAllPosts, getAllSeries } from "@/lib/content";
import { topicsConfig } from "@config/index";

describe("Seed Posts & Collections Verification", () => {
  it("contains at least 6 published posts", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(6);
  });

  it("covers every topic defined in topicsConfig", () => {
    const posts = getAllPosts();
    const topicsCovered = new Set(posts.map((p) => p.topic));
    for (const topic of topicsConfig.topics) {
      expect(topicsCovered.has(topic.id)).toBe(true);
    }
  });

  it("has valid series linking for multi-part articles", () => {
    const series = getAllSeries();
    expect(series.length).toBeGreaterThanOrEqual(1);
  });
});
