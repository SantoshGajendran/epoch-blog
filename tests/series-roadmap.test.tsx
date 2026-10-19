import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SeriesRoadmapView } from "@/components/learn/series-roadmap-view";
import { siteConfig } from "@config/index";
import type { Series, Post } from "@/lib/content";

describe("SeriesRoadmapView Component", () => {
  const mockSeriesList: Series[] = [
    {
      id: "agentic-evals",
      title: "Agentic Evaluations Series",
      summary: "End-to-end framework for evaluating tool use and multi-agent reasoning.",
      order: 1,
      slug: "agentic-evals",
      permalink: "/series/agentic-evals",
      body: "",
    },
    {
      id: "cuda-deep-dive",
      title: "CUDA Systems Engineering",
      summary: "GPU programming from low-level kernels to distributed serving.",
      order: 2,
      slug: "cuda-deep-dive",
      permalink: "/series/cuda-deep-dive",
      body: "",
    },
  ];

  const mockPosts: Post[] = [
    // Deliberately unsorted in array to verify ascending sort by series.order
    {
      title: "Evaluating Multi-Agent Coordination",
      summary: "Benchmarking supervisor-worker agent dynamics.",
      date: "2026-03-02",
      topic: "autonomous-agents",
      tags: ["Agents", "Evals"],
      series: { id: "agentic-evals", order: 2 },
      draft: false,
      slug: "evaluating-multi-agent-coordination",
      permalink: "/posts/evaluating-multi-agent-coordination",
      readingTime: 7,
      body: "",
      toc: [],
      metadata: { readingTime: 5, wordCount: 1000 },
    },
    {
      title: "Benchmarking Tool Use with Synthetic Traces",
      summary: "Creating reproducible tool trajectories.",
      date: "2026-03-01",
      topic: "autonomous-agents",
      tags: ["Agents", "ToolUse"],
      series: { id: "agentic-evals", order: 1 },
      draft: false,
      slug: "benchmarking-tool-use",
      permalink: "/posts/benchmarking-tool-use",
      readingTime: 5,
      body: "",
      toc: [],
      metadata: { readingTime: 5, wordCount: 1000 },
    },
    {
      title: "Warp Divergence and Memory Coalescing",
      summary: "GPU microarchitecture optimization principles.",
      date: "2026-03-05",
      topic: "infrastructure",
      tags: ["CUDA", "GPU"],
      series: { id: "cuda-deep-dive", order: 1 },
      draft: false,
      slug: "warp-divergence-memory-coalescing",
      permalink: "/posts/warp-divergence-memory-coalescing",
      readingTime: 10,
      body: "",
      toc: [],
      metadata: { readingTime: 5, wordCount: 1000 },
    },
    {
      title: "Standalone Unrelated Post",
      summary: "This post belongs to no series.",
      date: "2026-03-10",
      topic: "infrastructure",
      tags: ["Infra"],
      draft: false,
      slug: "standalone-unrelated-post",
      permalink: "/posts/standalone-unrelated-post",
      readingTime: 3,
      body: "",
      toc: [],
      metadata: { readingTime: 5, wordCount: 1000 },
    },
  ];

  it("renders series cards with titles and summaries", () => {
    render(<SeriesRoadmapView seriesList={mockSeriesList} posts={mockPosts} />);

    expect(screen.getByText("Agentic Evaluations Series")).toBeInTheDocument();
    expect(
      screen.getByText(
        "End-to-end framework for evaluating tool use and multi-agent reasoning."
      )
    ).toBeInTheDocument();

    expect(screen.getByText("CUDA Systems Engineering")).toBeInTheDocument();
    expect(
      screen.getByText(
        "GPU programming from low-level kernels to distributed serving."
      )
    ).toBeInTheDocument();
  });

  it("matches and sorts series posts in ascending order by series.order", () => {
    render(<SeriesRoadmapView seriesList={mockSeriesList} posts={mockPosts} />);

    const agenticSeriesCard = screen
      .getByText("Agentic Evaluations Series")
      .closest("div");
    expect(agenticSeriesCard).not.toBeNull();

    // Verify both posts appear
    const post1Title = screen.getByText("Benchmarking Tool Use with Synthetic Traces");
    const post2Title = screen.getByText("Evaluating Multi-Agent Coordination");

    expect(post1Title).toBeInTheDocument();
    expect(post2Title).toBeInTheDocument();

    // Verify ordering in DOM: post 1 should appear before post 2
    expect(
      post1Title.compareDocumentPosition(post2Title) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders links to post permalinks", () => {
    render(<SeriesRoadmapView seriesList={mockSeriesList} posts={mockPosts} />);

    const linkPart1 = screen.getByRole("link", {
      name: /Benchmarking Tool Use with Synthetic Traces/i,
    });
    expect(linkPart1).toHaveAttribute("href", "/posts/benchmarking-tool-use");

    const linkPart2 = screen.getByRole("link", {
      name: /Evaluating Multi-Agent Coordination/i,
    });
    expect(linkPart2).toHaveAttribute("href", "/posts/evaluating-multi-agent-coordination");
  });

  it("renders part badges with siteConfig.ui.seriesPartPrefix and reading times with minReadSuffix", () => {
    render(<SeriesRoadmapView seriesList={mockSeriesList} posts={mockPosts} />);

    expect(
      screen.getAllByText(new RegExp(`${siteConfig.ui.seriesPartPrefix}\\s+1`, "i")).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(new RegExp(`${siteConfig.ui.seriesPartPrefix}\\s+2`, "i")).length
    ).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByText(new RegExp(`5\\s+${siteConfig.ui.minReadSuffix}`, "i"))
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`7\\s+${siteConfig.ui.minReadSuffix}`, "i"))
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`10\\s+${siteConfig.ui.minReadSuffix}`, "i"))
    ).toBeInTheDocument();
  });

  it("renders graceful empty fallback when seriesList is empty", () => {
    render(<SeriesRoadmapView seriesList={[]} posts={mockPosts} />);

    expect(screen.getByText(siteConfig.ui.noSearchResultsLabel)).toBeInTheDocument();
  });

  it("renders graceful empty chapter notice when series has no matching posts", () => {
    const emptySeries: Series = {
      id: "upcoming-series",
      title: "Upcoming Architecture Series",
      summary: "Future series with chapters still under research.",
      order: 3,
      slug: "upcoming-series",
      permalink: "/series/upcoming-series",
      body: "",
    };

    render(<SeriesRoadmapView seriesList={[emptySeries]} posts={mockPosts} />);

    expect(screen.getByText("Upcoming Architecture Series")).toBeInTheDocument();
    expect(screen.getByText(siteConfig.ui.noSearchResultsLabel)).toBeInTheDocument();
  });

  it("applies custom className to wrapper container", () => {
    const { container } = render(
      <SeriesRoadmapView
        seriesList={mockSeriesList}
        posts={mockPosts}
        className="custom-series-view"
      />
    );

    expect(container.firstChild).toHaveClass("custom-series-view");
  });
});
