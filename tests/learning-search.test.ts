import { describe, it, expect } from "vitest";
import { buildSearchIndex } from "@/lib/search";
import type { Post, Series, Path, Tip } from "@/lib/content";
import type { Topic } from "@config/schemas/topics";
import { siteConfig } from "@config/site";

const mockPosts: Post[] = [
  {
    slug: "evaluating-agent-tool-use",
    title: "Evaluating Agent Tool Use",
    summary: "Systematic evaluation protocols for tool-calling agent systems",
    date: "2026-03-01T00:00:00Z",
    topic: "agents",
    tags: ["evals", "benchmarks", "tool-calling"],
    permalink: "/posts/evaluating-agent-tool-use",
    readingTime: 6,
    draft: false,
    toc: [],
    metadata: { readingTime: 6, wordCount: 1200 },
    body: "",
  },
];

const mockTopics: Topic[] = [
  {
    id: "agents",
    label: "Agents",
    colorToken: "--c-agents",
    lightColor: "#0a86c0",
    darkColor: "#6fd3ff",
    clusterPosition: { x: 0.25, y: 0.36 },
    description: "Autonomous reasoning and tool use",
  },
];

const mockSeries: Series[] = [
  {
    id: "agent-architecture",
    title: "Agent Architecture Series",
    summary: "Deep dive into multi-agent systems",
    slug: "agent-architecture",
    permalink: "/series/agent-architecture",
    order: 1,
    body: "",
  },
];

const mockPaths: Path[] = [
  {
    id: "llm-systems",
    slug: "llm-systems",
    title: "LLM Systems Engineering",
    summary: "Master low-latency inference and speculative decoding with vLLM.",
    badge: "LLM",
    level: "Advanced",
    estimatedHours: 12,
    order: 1,
    steps: [
      {
        id: "speculative-decoding",
        title: "Speculative Decoding with Draft Models",
        description: "Implement draft-target verification loop.",
        postSlug: "evaluating-agent-tool-use",
        type: "article",
      },
    ],
    permalink: "/learn?tab=paths",
    body: "",
  },
];

const mockTips: Tip[] = [
  {
    id: "vllm-flashinfer",
    slug: "vllm-flashinfer",
    title: "Boost vLLM Throughput with FlashInfer",
    summary: "Enable FlashInfer attention backend in vLLM for 1.4x decode speedup.",
    badges: ["LLM", "Infra"],
    codeSnippet: "export VLLM_ATTENTION_BACKEND=FLASHINFER",
    copyLabel: "Copy snippet",
    order: 1,
    permalink: "/learn?tab=tips",
    body: "",
  },
];

describe("Learning Hub Search Indexing", () => {
  it("builds index with paths and tips and searches across them", () => {
    const engine = buildSearchIndex(
      mockPosts,
      mockSeries,
      mockTopics,
      [],
      mockPaths,
      mockTips
    );

    // Search query matching tip
    const tipResults = engine.search("FlashInfer");
    expect(tipResults.length).toBeGreaterThan(0);
    const tipItem = tipResults.find((r) => r.item.type === "tip");
    expect(tipItem).toBeDefined();
    expect(tipItem?.item.title).toBe("Boost vLLM Throughput with FlashInfer");
    expect(tipItem?.item.category).toBe(siteConfig.ui.tabTipsLabel);
    expect(tipItem?.item.tipId).toBe("vllm-flashinfer");
    expect(tipItem?.item.url).toBe("/learn?tab=tips");
    expect(tipItem?.item.tags).toEqual(["LLM", "Infra"]);

    // Search query matching path
    const pathResults = engine.search("speculative");
    expect(pathResults.length).toBeGreaterThan(0);
    const pathItem = pathResults.find((r) => r.item.type === "path");
    expect(pathItem).toBeDefined();
    expect(pathItem?.item.title).toBe("LLM Systems Engineering");
    expect(pathItem?.item.category).toBe(siteConfig.ui.tabPathsLabel);
    expect(pathItem?.item.pathId).toBe("llm-systems");
    expect(pathItem?.item.url).toBe("/learn?tab=paths");
    expect(pathItem?.item.tags).toEqual(["LLM", "Advanced"]);

    // Search query matching both
    const multiResults = engine.search("vllm");
    const foundTypes = multiResults.map((r) => r.item.type);
    expect(foundTypes).toContain("path");
    expect(foundTypes).toContain("tip");
  });

  it("handles empty paths and tips arrays gracefully", () => {
    const engine = buildSearchIndex(
      mockPosts,
      mockSeries,
      mockTopics,
      [],
      [],
      []
    );

    const results = engine.search("FlashInfer");
    expect(results).toHaveLength(0);
  });

  it("disambiguates colliding IDs when path or tip has the same ID as an existing post or topic", () => {
    const collidingPath: Path = {
      ...mockPaths[0],
      id: "evaluating-agent-tool-use", // Same ID as post slug
      title: "Evaluating LLM Systems",
    };

    const engine = buildSearchIndex(
      mockPosts,
      mockSeries,
      mockTopics,
      [],
      [collidingPath],
      mockTips
    );

    const results = engine.search("evaluating");
    const pathResult = results.find((r) => r.item.type === "path");
    const postResult = results.find((r) => r.item.type === "post");

    expect(pathResult).toBeDefined();
    expect(postResult).toBeDefined();
    expect(pathResult?.item.id).not.toBe(postResult?.item.id);
  });
});
