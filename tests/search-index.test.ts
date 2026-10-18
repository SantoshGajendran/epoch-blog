import { describe, it, expect, vi } from "vitest";
import { buildSearchIndex } from "@/lib/search";
import type { SearchActionItem } from "@/lib/search/types";
import type { Post, Series } from "@/lib/content";
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
  {
    slug: "dense-retrieval-failures",
    title: "Dense Retrieval Failures in Production",
    summary: "Analyzing vector search recall regressions and ranker discrepancies",
    date: "2026-03-05T00:00:00Z",
    topic: "rag",
    tags: ["retrieval", "vector-search", "dense-chunking"],
    permalink: "/posts/dense-retrieval-failures",
    readingTime: 8,
    draft: false,
    toc: [],
    metadata: { readingTime: 8, wordCount: 1600 },
    body: "",
  },
  {
    slug: "qlora-memory-budgeting",
    title: "QLoRA Memory Budgeting Guide",
    summary: "VRAM allocation strategies for fine-tuning 70B parameter models",
    date: "2026-03-10T00:00:00Z",
    topic: "tune",
    tags: ["fine-tuning", "qlora", "vram"],
    permalink: "/posts/qlora-memory-budgeting",
    readingTime: 5,
    draft: false,
    toc: [],
    metadata: { readingTime: 5, wordCount: 1000 },
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
    description: "Autonomous reasoning, tool-calling architectures, and resilient memory.",
  },
  {
    id: "rag",
    label: "RAG",
    colorToken: "--c-rag",
    lightColor: "#6c9400",
    darkColor: "#c8f43a",
    clusterPosition: { x: 0.75, y: 0.36 },
    description: "Retrieval evaluation, hybrid search, dense chunking, and rankers.",
  },
];

const mockSeries: Series[] = [
  {
    id: "rag-deep-dive",
    slug: "rag-deep-dive",
    title: "RAG Deep Dive Series",
    summary: "From vector indexes to reciprocal rank fusion in modern pipelines",
    order: 1,
    permalink: "/series/rag-deep-dive",
    body: "",
  },
];

const mockActions: SearchActionItem[] = [
  {
    id: "toggle-theme",
    title: siteConfig.ui.actionSwitchThemeLabel,
    category: siteConfig.ui.searchGroupActionsLabel,
    action: vi.fn(),
  },
  {
    id: "switch-map",
    title: siteConfig.ui.actionShowMapLabel,
    category: siteConfig.ui.searchGroupActionsLabel,
    action: vi.fn(),
  },
  {
    id: "switch-list",
    title: siteConfig.ui.actionShowListLabel,
    category: siteConfig.ui.searchGroupActionsLabel,
    action: vi.fn(),
  },
];

describe("Search Index Engine & MiniSearch Integration", () => {
  it("builds an index containing posts, topics, series, and actions with complete metadata", () => {
    const engine = buildSearchIndex(mockPosts, mockSeries, mockTopics, mockActions);
    expect(engine).toBeDefined();

    // Verify search matches each item type
    const postResults = engine.search("Evaluating");
    expect(postResults.length).toBeGreaterThan(0);
    expect(postResults[0].item.type).toBe("post");
    expect(postResults[0].item.slug).toBe("evaluating-agent-tool-use");
    expect(postResults[0].item.category).toBe(siteConfig.ui.searchGroupPostsLabel);

    const topicResults = engine.search("Autonomous reasoning");
    expect(topicResults.length).toBeGreaterThan(0);
    const topicItem = topicResults.find((r) => r.item.type === "topic");
    expect(topicItem).toBeDefined();
    expect(topicItem?.item.topicId).toBe("agents");
    expect(topicItem?.item.category).toBe(siteConfig.ui.searchGroupTopicsLabel);

    const seriesResults = engine.search("Deep Dive");
    expect(seriesResults.length).toBeGreaterThan(0);
    const seriesItem = seriesResults.find((r) => r.item.type === "series");
    expect(seriesItem).toBeDefined();
    expect(seriesItem?.item.seriesId).toBe("rag-deep-dive");
    expect(seriesItem?.item.category).toBe(siteConfig.ui.searchGroupSeriesLabel);

    const actionResults = engine.search("Toggle theme");
    expect(actionResults.length).toBeGreaterThan(0);
    const actionItem = actionResults.find((r) => r.item.type === "action");
    expect(actionItem).toBeDefined();
    expect(actionItem?.item.actionId).toBe("toggle-theme");
    expect(actionItem?.item.category).toBe(siteConfig.ui.searchGroupActionsLabel);
  });

  it("matches exact and prefix queries on title, summary, tags, and category labels", () => {
    const engine = buildSearchIndex(mockPosts, mockSeries, mockTopics, mockActions);

    // Prefix search on title
    const prefixTitle = engine.search("eval");
    expect(prefixTitle.some((r) => r.item.slug === "evaluating-agent-tool-use")).toBe(true);

    // Exact search on tags
    const tagMatch = engine.search("vector-search");
    expect(tagMatch.some((r) => r.item.slug === "dense-retrieval-failures")).toBe(true);

    // Prefix search on tags
    const prefixTag = engine.search("bench");
    expect(prefixTag.some((r) => r.item.slug === "evaluating-agent-tool-use")).toBe(true);

    // Search on summary
    const summaryMatch = engine.search("discrepancies");
    expect(summaryMatch.some((r) => r.item.slug === "dense-retrieval-failures")).toBe(true);

    // Search on category label
    const categoryMatch = engine.search(siteConfig.ui.searchGroupSeriesLabel);
    expect(categoryMatch.some((r) => r.item.type === "series")).toBe(true);
  });

  it("handles fuzzy search queries with minor typos", () => {
    const engine = buildSearchIndex(mockPosts, mockSeries, mockTopics, mockActions);

    // Typo: "retrevial" instead of "retrieval"
    const fuzzyRetrieval = engine.search("retrevial");
    expect(fuzzyRetrieval.length).toBeGreaterThan(0);
    expect(fuzzyRetrieval.some((r) => r.item.slug === "dense-retrieval-failures")).toBe(true);

    // Typo: "budgetting" instead of "budgeting"
    const fuzzyBudgeting = engine.search("budgetting");
    expect(fuzzyBudgeting.length).toBeGreaterThan(0);
    expect(fuzzyBudgeting.some((r) => r.item.slug === "qlora-memory-budgeting")).toBe(true);
  });

  it("returns defaults (featured actions and recent posts) for empty or whitespace query", () => {
    const engine = buildSearchIndex(mockPosts, mockSeries, mockTopics, mockActions);

    const emptyResults = engine.search("");
    expect(emptyResults.length).toBeGreaterThan(0);

    const whitespaceResults = engine.search("   ");
    expect(whitespaceResults.length).toBe(emptyResults.length);

    // Verify actions are present
    const actions = emptyResults.filter((r) => r.item.type === "action");
    expect(actions.length).toBe(mockActions.length);
    expect(actions[0].item.title).toBe(siteConfig.ui.actionSwitchThemeLabel);

    // Verify posts are sorted by date descending (newest first: qlora > dense > evaluating)
    const posts = emptyResults.filter((r) => r.item.type === "post");
    expect(posts.length).toBe(mockPosts.length);
    expect(posts[0].item.slug).toBe("qlora-memory-budgeting");
    expect(posts[1].item.slug).toBe("dense-retrieval-failures");
    expect(posts[2].item.slug).toBe("evaluating-agent-tool-use");
  });

  it("ranks title matches higher than summary matches through field boosting", () => {
    // Post A has "quantum" in title, Post B has "quantum" only in summary
    const testPosts: Post[] = [
      {
        slug: "post-title-match",
        title: "Quantum State Evaluation",
        summary: "Normal overview of machine learning",
        date: "2026-03-01T00:00:00Z",
        topic: "agents",
        tags: ["evals"],
        permalink: "/posts/post-title-match",
        readingTime: 3,
        draft: false,
        toc: [],
        metadata: { readingTime: 3, wordCount: 600 },
        body: "",
      },
      {
        slug: "post-summary-match",
        title: "Architectural Foundations",
        summary: "Exploring quantum compute limits and memory models",
        date: "2026-03-01T00:00:00Z",
        topic: "agents",
        tags: ["infra"],
        permalink: "/posts/post-summary-match",
        readingTime: 3,
        draft: false,
        toc: [],
        metadata: { readingTime: 3, wordCount: 600 },
        body: "",
      },
    ];

    const engine = buildSearchIndex(testPosts, [], []);
    const results = engine.search("Quantum");

    expect(results.length).toBe(2);
    expect(results[0].item.slug).toBe("post-title-match");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("handles optional actions parameter gracefully without error", () => {
    const engine = buildSearchIndex(mockPosts, mockSeries, mockTopics);
    expect(() => engine.search("evaluating")).not.toThrow();
    const defaults = engine.search("");
    expect(defaults.some((r) => r.item.type === "post")).toBe(true);
  });

  it("meets sub-10ms query latency performance budget for 50+ posts", () => {
    // Generate 60 synthetic posts
    const syntheticPosts: Post[] = Array.from({ length: 60 }, (_, i) => ({
      slug: `synthetic-post-${i}`,
      title: `Scalable Inference Engine Architecture ${i} on Kubernetes`,
      summary: `High throughput serving patterns for deep learning with continuous batching ${i}`,
      date: new Date(2026, 0, 1 + (i % 28)).toISOString(),
      topic: i % 2 === 0 ? "infra" : "rag",
      tags: [`tag-${i % 5}`, "inference", "throughput"],
      permalink: `/posts/synthetic-post-${i}`,
      readingTime: 4,
      draft: false,
      toc: [],
      metadata: { readingTime: 4, wordCount: 800 },
      body: "",
    }));

    const engine = buildSearchIndex(syntheticPosts, mockSeries, mockTopics, mockActions);

    // Warm-up search
    engine.search("Inference");

    // Benchmark 20 searches
    const iterations = 20;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const query = i % 2 === 0 ? "kubernetes" : "batching";
      const results = engine.search(query);
      expect(results.length).toBeGreaterThan(0);
    }
    const elapsed = performance.now() - start;
    const averageMs = elapsed / iterations;

    // Must be well below 10ms (performance budget is 50ms)
    expect(averageMs).toBeLessThan(10);
  });
});
