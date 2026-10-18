import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "@/app/page";
import { TopicChips } from "@/components/network/topic-chips";
import { PostListView } from "@/components/network/post-list-view";
import { siteConfig, topicsConfig } from "@config/index";
import { getAllPosts } from "@/lib/content";

function createMockContext() {
  return {
    canvas: { width: 800, height: 600, style: { width: "800px", height: "600px" } },
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "#000",
    fillStyle: "#000",
    font: "",
    textAlign: "left",
    shadowColor: "",
    shadowBlur: 0,
    lineDashOffset: 0,
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    roundRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  };
}

describe("Home Page & Presentation Components", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock requestAnimationFrame / cancelAnimationFrame
    vi.stubGlobal("requestAnimationFrame", (cb: (time: number) => void) => {
      return setTimeout(() => cb(Date.now()), 16) as unknown as number;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });

    // Mock Canvas 2D
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((id: string) => {
      if (id === "2d") return createMockContext();
      return null;
    });

    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Mock ResizeObserver
    class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    // Mock IntersectionObserver
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe("TopicChips component", () => {
    it("renders 'All topics' and each topic from topicsConfig with correct aria-pressed states", () => {
      const handleSelectTopic = vi.fn();
      const handleViewModeChange = vi.fn();

      render(
        <TopicChips
          topics={topicsConfig.topics}
          activeTopicId={null}
          onSelectTopic={handleSelectTopic}
          viewMode="map"
          onViewModeChange={handleViewModeChange}
        />
      );

      // All topics button
      const allButton = screen.getByRole("button", { name: siteConfig.ui.allTopicsLabel });
      expect(allButton).toBeInTheDocument();
      expect(allButton).toHaveAttribute("aria-pressed", "true");

      // Each configured topic
      for (const topic of topicsConfig.topics) {
        const topicButton = screen.getByRole("button", { name: new RegExp(topic.label, "i") });
        expect(topicButton).toBeInTheDocument();
        expect(topicButton).toHaveAttribute("aria-pressed", "false");
      }

      // Map and List buttons
      const mapButton = screen.getByRole("button", { name: siteConfig.ui.mapViewLabel });
      const listButton = screen.getByRole("button", { name: siteConfig.ui.listViewLabel });
      expect(mapButton).toHaveAttribute("aria-pressed", "true");
      expect(listButton).toHaveAttribute("aria-pressed", "false");
    });

    it("displays color token indicators for each topic pill", () => {
      render(
        <TopicChips
          topics={topicsConfig.topics}
          activeTopicId={null}
          onSelectTopic={vi.fn()}
          viewMode="map"
          onViewModeChange={vi.fn()}
        />
      );

      // Verify each topic has a colored indicator matching var(colorToken)
      for (const topic of topicsConfig.topics) {
        const button = screen.getByRole("button", { name: new RegExp(topic.label, "i") });
        const dot = button.querySelector("span[style*='background-color']");
        expect(dot).toBeInTheDocument();
        expect(dot?.getAttribute("style")).toContain(`var(${topic.colorToken})`);
      }
    });

    it("fires callbacks when topic pills or segmented view toggles are clicked", () => {
      const handleSelectTopic = vi.fn();
      const handleViewModeChange = vi.fn();

      render(
        <TopicChips
          topics={topicsConfig.topics}
          activeTopicId="agents"
          onSelectTopic={handleSelectTopic}
          viewMode="map"
          onViewModeChange={handleViewModeChange}
        />
      );

      // Agents chip is active
      const agentsButton = screen.getByRole("button", {
        name: new RegExp(topicsConfig.topics[0].label, "i"),
      });
      expect(agentsButton).toHaveAttribute("aria-pressed", "true");

      // Click another topic (e.g. second topic)
      const secondTopic = topicsConfig.topics[1];
      const secondButton = screen.getByRole("button", { name: new RegExp(secondTopic.label, "i") });
      fireEvent.click(secondButton);
      expect(handleSelectTopic).toHaveBeenCalledWith(secondTopic.id);

      // Click All topics
      const allButton = screen.getByRole("button", { name: siteConfig.ui.allTopicsLabel });
      fireEvent.click(allButton);
      expect(handleSelectTopic).toHaveBeenCalledWith(null);

      // Click List view mode
      const listButton = screen.getByRole("button", { name: siteConfig.ui.listViewLabel });
      fireEvent.click(listButton);
      expect(handleViewModeChange).toHaveBeenCalledWith("list");
    });

    it("styles active segmented control button with Glacier Circuit lime highlight", () => {
      const { rerender } = render(
        <TopicChips
          topics={topicsConfig.topics}
          activeTopicId={null}
          onSelectTopic={vi.fn()}
          viewMode="map"
          onViewModeChange={vi.fn()}
        />
      );

      const mapButton = screen.getByRole("button", { name: siteConfig.ui.mapViewLabel });
      const listButton = screen.getByRole("button", { name: siteConfig.ui.listViewLabel });

      expect(mapButton.className).toMatch(/bg-lime/);
      expect(mapButton.className).toMatch(/text-limeink/);
      expect(listButton.className).not.toMatch(/bg-lime/);

      // Rerender with list view
      rerender(
        <TopicChips
          topics={topicsConfig.topics}
          activeTopicId={null}
          onSelectTopic={vi.fn()}
          viewMode="list"
          onViewModeChange={vi.fn()}
        />
      );

      expect(listButton.className).toMatch(/bg-lime/);
      expect(listButton.className).toMatch(/text-limeink/);
      expect(mapButton.className).not.toMatch(/bg-lime/);
    });

    it("supports responsive flex wrapping for mobile viewports", () => {
      const { container } = render(
        <TopicChips
          topics={topicsConfig.topics}
          activeTopicId={null}
          onSelectTopic={vi.fn()}
          viewMode="map"
          onViewModeChange={vi.fn()}
        />
      );

      const controlBar = container.firstElementChild;
      expect(controlBar?.className).toMatch(/flex-wrap/);
    });
  });

  describe("PostListView component", () => {
    const allPosts = getAllPosts();

    it("renders semantic list with role='list' and list items linking to posts", () => {
      render(<PostListView posts={allPosts} activeTopicId={null} />);

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();

      const items = within(list).getAllByRole("listitem");
      expect(items.length).toBe(allPosts.length);

      // Check first item details
      const firstPost = allPosts[0];
      const link = within(items[0]).getByRole("link");
      expect(link).toHaveAttribute("href", firstPost.permalink);
      expect(within(items[0]).getByText(firstPost.title)).toBeInTheDocument();
      expect(within(items[0]).getByText(firstPost.summary)).toBeInTheDocument();
      expect(
        within(items[0]).getByText(new RegExp(`${firstPost.readingTime} ${siteConfig.ui.minReadSuffix}`))
      ).toBeInTheDocument();
    });

    it("renders topic color dot and topic label for each post card", () => {
      render(<PostListView posts={allPosts} activeTopicId={null} />);

      for (const post of allPosts) {
        const topic = topicsConfig.topics.find((t) => t.id === post.topic);
        expect(topic).toBeDefined();

        const postHeading = screen.getByText(post.title);
        const card = postHeading.closest("li");
        expect(card).toBeInTheDocument();

        // Check topic label
        expect(within(card!).getByText(topic!.label)).toBeInTheDocument();

        // Check dot indicator
        const dot = card!.querySelector("span[style*='background-color']");
        expect(dot).toBeInTheDocument();
        expect(dot?.getAttribute("style")).toContain(`var(${topic!.colorToken})`);
      }
    });

    it("filters posts by activeTopicId when a topic filter is selected", () => {
      const targetTopic = topicsConfig.topics[0].id;
      const expectedPosts = allPosts.filter((p) => p.topic === targetTopic);
      const otherPosts = allPosts.filter((p) => p.topic !== targetTopic);

      render(<PostListView posts={allPosts} activeTopicId={targetTopic} />);

      const items = screen.getAllByRole("listitem");
      expect(items.length).toBe(expectedPosts.length);

      for (const post of expectedPosts) {
        expect(screen.getByText(post.title)).toBeInTheDocument();
      }
      for (const post of otherPosts) {
        expect(screen.queryByText(post.title)).not.toBeInTheDocument();
      }
    });
  });

  describe("Home Page integration", () => {
    it("renders Hero with site name, tagline, and description from config", () => {
      render(<Home />);

      // Site name
      expect(screen.getByText(siteConfig.name)).toBeInTheDocument();

      // Tagline in h1
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent(siteConfig.tagline);

      // Description in lead paragraph
      expect(screen.getByText(siteConfig.description)).toBeInTheDocument();
    });

    it("renders TopicChips and prototype hint text", () => {
      render(<Home />);

      // Topic chips
      expect(screen.getByRole("button", { name: siteConfig.ui.allTopicsLabel })).toBeInTheDocument();
      for (const topic of topicsConfig.topics) {
        expect(screen.getByRole("button", { name: new RegExp(topic.label, "i") })).toBeInTheDocument();
      }

      // Prototype hint
      expect(screen.getByText(siteConfig.ui.prototypeHint)).toBeInTheDocument();
    });

    it("toggles between Map View and List View via segmented control", () => {
      render(<Home />);

      // By default, Map view is rendered (canvas with role="region")
      expect(screen.getByRole("region", { name: /map/i })).toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();

      // Switch to List View
      const listButton = screen.getByRole("button", { name: siteConfig.ui.listViewLabel });
      fireEvent.click(listButton);

      // Now List View is rendered with all posts
      expect(screen.getByRole("list")).toBeInTheDocument();
      const allPosts = getAllPosts();
      const listItems = screen.getAllByRole("listitem");
      expect(listItems.length).toBe(allPosts.length);
      expect(screen.queryByRole("region", { name: /map/i })).not.toBeInTheDocument();

      // Switch back to Map View
      const mapButton = screen.getByRole("button", { name: siteConfig.ui.mapViewLabel });
      fireEvent.click(mapButton);

      expect(screen.getByRole("region", { name: /map/i })).toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("filters posts in List View when topic chips are clicked", () => {
      render(<Home />);

      // Switch to list view first
      const listButton = screen.getByRole("button", { name: siteConfig.ui.listViewLabel });
      fireEvent.click(listButton);

      const targetTopic = topicsConfig.topics[0];
      const targetButton = screen.getByRole("button", { name: new RegExp(targetTopic.label, "i") });

      // Click topic filter
      fireEvent.click(targetButton);
      expect(targetButton).toHaveAttribute("aria-pressed", "true");

      const allPosts = getAllPosts();
      const expectedPosts = allPosts.filter((p) => p.topic === targetTopic.id);
      const items = screen.getAllByRole("listitem");
      expect(items.length).toBe(expectedPosts.length);

      // Click All Topics to reset
      const allButton = screen.getByRole("button", { name: siteConfig.ui.allTopicsLabel });
      fireEvent.click(allButton);
      expect(allButton).toHaveAttribute("aria-pressed", "true");
      expect(screen.getAllByRole("listitem").length).toBe(allPosts.length);
    });

    it("renders responsive layout elements down to mobile viewport widths", () => {
      const { container } = render(<Home />);
      const main = container.querySelector("main");
      expect(main).toHaveClass("mx-auto", "max-w-6xl");
    });
  });
});
