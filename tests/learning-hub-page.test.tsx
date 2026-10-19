import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { siteConfig } from "@config/site";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { Header } from "@/components/layout/header";
import { LearnHubView } from "@/components/learn/learn-hub-view";
import LearnPage from "@/app/learn/page";
import { clearProgress } from "@/lib/learn/progress-storage";
import type { Post, Series, Path, Tip } from "@/lib/content";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/learn",
}));

const mockPosts: Post[] = [
  {
    slug: "post-1",
    title: "Understanding PagedAttention",
    summary: "Deep dive into virtual memory management for LLM kv caches.",
    date: "2026-03-01T00:00:00Z",
    topic: "infra",
    tags: ["llm", "infra"],
    permalink: "/posts/post-1",
    readingTime: 6,
    draft: false,
    toc: [],
    metadata: { readingTime: 6, wordCount: 1200 },
    body: "",
    series: { id: "series-llm-perf", order: 1 },
  },
  {
    slug: "post-2",
    title: "Speculative Decoding Benchmarks",
    summary: "Speedup analysis with small draft models.",
    date: "2026-03-05T00:00:00Z",
    topic: "infra",
    tags: ["llm", "benchmarks"],
    permalink: "/posts/post-2",
    readingTime: 5,
    draft: false,
    toc: [],
    metadata: { readingTime: 5, wordCount: 1000 },
    body: "",
    series: { id: "series-llm-perf", order: 2 },
  },
];

const mockSeries: Series[] = [
  {
    id: "series-llm-perf",
    title: "LLM Performance Engineering Series",
    summary: "In-depth guide to low-latency inference architectures.",
    slug: "llm-perf",
    permalink: "/series/llm-perf",
    order: 1,
    body: "",
  },
];

const mockPaths: Path[] = [
  {
    id: "llm-inference",
    slug: "llm-inference",
    title: "LLM Inference Systems",
    summary: "Production serving architecture and KV caching.",
    badge: "LLM",
    level: "Advanced",
    estimatedHours: 10,
    order: 1,
    steps: [
      {
        id: "step-1",
        title: "PagedAttention Architecture",
        description: "Study virtual memory pagination.",
        postSlug: "post-1",
        type: "article",
      },
      {
        id: "step-2",
        title: "Speculative Verification Loop",
        description: "Draft model evaluation.",
        postSlug: "post-2",
        type: "benchmark",
      },
    ],
    permalink: "/learn?tab=paths",
    body: "",
  },
  {
    id: "agent-architecture",
    slug: "agent-architecture",
    title: "Autonomous Agent Architectures",
    summary: "ReAct, plan-and-solve, and tool execution pipelines.",
    badge: "Agents",
    level: "Intermediate",
    estimatedHours: 8,
    order: 2,
    steps: [
      {
        id: "step-agent-1",
        title: "Tool Execution Safety",
        description: "Sandbox execution.",
        type: "code",
      },
    ],
    permalink: "/learn?tab=paths",
    body: "",
  },
];

const mockTips: Tip[] = [
  {
    id: "flashinfer-backend",
    slug: "flashinfer-backend",
    title: "vLLM FlashInfer Configuration",
    summary: "Enable high-throughput FlashInfer attention kernels.",
    badges: ["LLM", "Infra"],
    codeSnippet: "export VLLM_ATTENTION_BACKEND=FLASHINFER",
    copyLabel: "Copy snippet",
    order: 1,
    permalink: "/learn?tab=tips",
    body: "",
  },
  {
    id: "rag-chunking",
    slug: "rag-chunking",
    title: "Contextual Retrieval Chunking",
    summary: "Prepend document summaries to vector chunks.",
    badges: ["RAG"],
    codeSnippet: "python -m epoch.chunk --contextual",
    copyLabel: "Copy snippet",
    order: 2,
    permalink: "/learn?tab=tips",
    body: "",
  },
];

describe("Learning Hub Page & Navigation", () => {
  beforeEach(() => {
    clearProgress();
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe("Header Navigation", () => {
    it("renders navigation link to /learn with configured label", () => {
      render(
        <ThemeProvider>
          <Header />
        </ThemeProvider>
      );
      const learnLink = screen.getByRole("link", { name: siteConfig.ui.navLearnLabel });
      expect(learnLink).toBeInTheDocument();
      expect(learnLink).toHaveAttribute("href", "/learn");
    });
  });

  describe("LearnPage Component", () => {
    it("renders the static server page without errors", () => {
      render(<LearnPage />);
      expect(screen.getByRole("heading", { level: 1, name: siteConfig.ui.learnHubTitle })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: siteConfig.ui.tabPathsLabel })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: siteConfig.ui.tabSeriesLabel })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: siteConfig.ui.tabTipsLabel })).toBeInTheDocument();
    });
  });

  describe("LearnHubView", () => {
    it("renders title, tagline, telemetry stats bar, and 3 accessible tabs", () => {
      render(
        <LearnHubView
          posts={mockPosts}
          series={mockSeries}
          paths={mockPaths}
          tips={mockTips}
        />
      );

      // Title & Tagline
      expect(screen.getByRole("heading", { level: 1, name: siteConfig.ui.learnHubTitle })).toBeInTheDocument();
      expect(screen.getByText(siteConfig.ui.learnHubTagline)).toBeInTheDocument();

      // Telemetry Stats Bar
      expect(screen.getByRole("status")).toBeInTheDocument();
      // Total milestones is 3 (2 from llm-inference + 1 from agent-architecture)
      expect(screen.getByText(/0\/3/)).toBeInTheDocument();

      // Accessible Tablist & Tabs
      const tablist = screen.getByRole("tablist");
      expect(tablist).toBeInTheDocument();

      const pathsTab = screen.getByRole("tab", { name: siteConfig.ui.tabPathsLabel });
      const seriesTab = screen.getByRole("tab", { name: siteConfig.ui.tabSeriesLabel });
      const tipsTab = screen.getByRole("tab", { name: siteConfig.ui.tabTipsLabel });

      expect(pathsTab).toHaveAttribute("aria-selected", "true");
      expect(seriesTab).toHaveAttribute("aria-selected", "false");
      expect(tipsTab).toHaveAttribute("aria-selected", "false");

      // Initially displays paths
      expect(screen.getByText("LLM Inference Systems")).toBeInTheDocument();
      expect(screen.getByText("Autonomous Agent Architectures")).toBeInTheDocument();
    });

    it("switches tabs between Paths, Series, and Tips on click", () => {
      render(
        <LearnHubView
          posts={mockPosts}
          series={mockSeries}
          paths={mockPaths}
          tips={mockTips}
        />
      );

      const pathsTab = screen.getByRole("tab", { name: siteConfig.ui.tabPathsLabel });
      const seriesTab = screen.getByRole("tab", { name: siteConfig.ui.tabSeriesLabel });
      const tipsTab = screen.getByRole("tab", { name: siteConfig.ui.tabTipsLabel });

      // Switch to Tips tab
      fireEvent.click(tipsTab);
      expect(tipsTab).toHaveAttribute("aria-selected", "true");
      expect(pathsTab).toHaveAttribute("aria-selected", "false");
      expect(screen.getByText("vLLM FlashInfer Configuration")).toBeInTheDocument();
      expect(screen.getByText("Contextual Retrieval Chunking")).toBeInTheDocument();

      // Switch to Series tab
      fireEvent.click(seriesTab);
      expect(seriesTab).toHaveAttribute("aria-selected", "true");
      expect(tipsTab).toHaveAttribute("aria-selected", "false");
      expect(screen.getByText("LLM Performance Engineering Series")).toBeInTheDocument();
      expect(screen.getByText("Understanding PagedAttention")).toBeInTheDocument();
      expect(screen.getByText("Speculative Decoding Benchmarks")).toBeInTheDocument();

      // Switch back to Paths tab
      fireEvent.click(pathsTab);
      expect(pathsTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("LLM Inference Systems")).toBeInTheDocument();
    });

    it("navigates tabs using Left and Right arrow keys", () => {
      render(
        <LearnHubView
          posts={mockPosts}
          series={mockSeries}
          paths={mockPaths}
          tips={mockTips}
        />
      );

      const pathsTab = screen.getByRole("tab", { name: siteConfig.ui.tabPathsLabel });
      const seriesTab = screen.getByRole("tab", { name: siteConfig.ui.tabSeriesLabel });
      const tipsTab = screen.getByRole("tab", { name: siteConfig.ui.tabTipsLabel });

      pathsTab.focus();
      // ArrowRight -> Series
      fireEvent.keyDown(pathsTab, { key: "ArrowRight" });
      expect(seriesTab).toHaveAttribute("aria-selected", "true");

      // ArrowRight -> Tips
      fireEvent.keyDown(seriesTab, { key: "ArrowRight" });
      expect(tipsTab).toHaveAttribute("aria-selected", "true");

      // ArrowRight wraps to Paths
      fireEvent.keyDown(tipsTab, { key: "ArrowRight" });
      expect(pathsTab).toHaveAttribute("aria-selected", "true");

      // ArrowLeft wraps back to Tips
      fireEvent.keyDown(pathsTab, { key: "ArrowLeft" });
      expect(tipsTab).toHaveAttribute("aria-selected", "true");
    });

    it("filters items by badge in Paths and Tips tabs", () => {
      render(
        <LearnHubView
          posts={mockPosts}
          series={mockSeries}
          paths={mockPaths}
          tips={mockTips}
        />
      );

      // In Paths tab: filter by "LLM"
      const llmBadge = screen.getByRole("button", { name: /LLM/i });
      fireEvent.click(llmBadge);

      expect(screen.getByText("LLM Inference Systems")).toBeInTheDocument();
      expect(screen.queryByText("Autonomous Agent Architectures")).not.toBeInTheDocument();

      // Reset with "All"
      const allBadge = screen.getByRole("button", { name: new RegExp(siteConfig.ui.filterAllLabel, "i") });
      fireEvent.click(allBadge);
      expect(screen.getByText("Autonomous Agent Architectures")).toBeInTheDocument();

      // Switch to Tips tab
      const tipsTab = screen.getByRole("tab", { name: siteConfig.ui.tabTipsLabel });
      fireEvent.click(tipsTab);

      // Filter by RAG
      const ragBadge = screen.getByRole("button", { name: /RAG/i });
      fireEvent.click(ragBadge);

      expect(screen.getByText("Contextual Retrieval Chunking")).toBeInTheDocument();
      expect(screen.queryByText("vLLM FlashInfer Configuration")).not.toBeInTheDocument();
    });

    it("displays empty state when active filter matches no items", () => {
      render(
        <LearnHubView
          posts={mockPosts}
          series={mockSeries}
          paths={mockPaths}
          tips={mockTips}
        />
      );

      // Click "Setup" badge which has 0 paths
      const setupBadge = screen.getByRole("button", { name: /Setup/i });
      fireEvent.click(setupBadge);

      expect(screen.getByText(siteConfig.ui.noSearchResultsLabel)).toBeInTheDocument();
    });

    it("updates telemetry stats bar and path progress when a milestone step is completed", () => {
      render(
        <LearnHubView
          posts={mockPosts}
          series={mockSeries}
          paths={mockPaths}
          tips={mockTips}
        />
      );

      expect(screen.getByText(/0\/3/)).toBeInTheDocument();

      // Check the first milestone checkbox in "LLM Inference Systems"
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);

      act(() => {
        fireEvent.click(checkboxes[0]);
      });

      // Stats bar should now show 1/3 completed
      expect(screen.getByText(/1\/3/)).toBeInTheDocument();
      expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
    });
  });
});
