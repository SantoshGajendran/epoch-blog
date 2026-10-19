import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { siteConfig, topicsConfig } from "@config/index";
import type { Post } from "@/lib/content";
import * as audioModule from "@/lib/audio/sound-provider";

import { NetworkMap3D } from "@/components/network/network-map-3d";
import { TopicChips } from "@/components/network/topic-chips";
import { ThreeNetworkRenderer } from "@/lib/network";

function createMockPost(overrides: Partial<Post> = {}): Post {
  return {
    slug: "post-agents-1",
    title: "Evaluating Multi-Agent Systems",
    summary: "Benchmarking trajectory divergence in complex tool use.",
    date: "2026-03-01",
    topic: "agents",
    tags: ["evals", "benchmarks"],
    permalink: "/posts/post-agents-1",
    readingTime: 4,
    draft: false,
    toc: [],
    body: "Content",
    metadata: { readingTime: 4, wordCount: 800 },
    ...overrides,
  };
}

const mockPosts: Post[] = [
  createMockPost({
    slug: "post-agents-1",
    title: "Evaluating Multi-Agent Systems",
    summary: "Benchmarking trajectory divergence in complex tool use.",
    date: "2026-03-01",
    topic: "agents",
    permalink: "/posts/post-agents-1",
  }),
  createMockPost({
    slug: "post-rag-1",
    title: "Hybrid Search with Reciprocal Rank Fusion",
    summary: "Combining dense vector index with sparse BM25 retrieval.",
    date: "2026-03-10",
    topic: "rag",
    permalink: "/posts/post-rag-1",
  }),
  createMockPost({
    slug: "post-tune-1",
    title: "QLoRA Quantization Boundaries",
    summary: "Loss landscapes across 4-bit and 8-bit adapter merges.",
    date: "2026-03-15",
    topic: "tune",
    permalink: "/posts/post-tune-1",
  }),
];

describe("NetworkMap3D & 2D/3D Mode Integration", () => {
  let resizeObserverCallback: ResizeObserverCallback | null = null;
  let intersectionObserverCallback: IntersectionObserverCallback | null = null;
  let mutationObserverCallback: MutationCallback | null = null;

  let observeResizeMock = vi.fn();
  let disconnectResizeMock = vi.fn();
  let observeIntersectionMock = vi.fn();
  let disconnectIntersectionMock = vi.fn();
  let observeMutationMock = vi.fn();
  let disconnectMutationMock = vi.fn();

  let rafCallbacks: ((time: number) => void)[] = [];
  let rafIdCounter = 0;
  let cancelRafMock = vi.fn();

  let playSoundMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    rafCallbacks = [];
    rafIdCounter = 0;
    playSoundMock = vi.fn();

    // Mock HTMLCanvasElement.prototype.getContext to safely degrade in jsdom
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);

    // Mock PointerEvent in jsdom
    if (typeof window !== "undefined" && !window.PointerEvent) {
      window.PointerEvent = window.MouseEvent as unknown as typeof PointerEvent;
    }

    // Mock useOptionalSound
    vi.spyOn(audioModule, "useOptionalSound").mockReturnValue({
      isSoundEnabled: true,
      toggleSound: vi.fn(),
      playSound: playSoundMock,
    });

    // Mock requestAnimationFrame / cancelAnimationFrame
    vi.stubGlobal("requestAnimationFrame", (cb: (time: number) => void) => {
      const id = ++rafIdCounter;
      rafCallbacks.push(cb);
      return id;
    });
    cancelRafMock = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelRafMock);

    // Mock ResizeObserver
    observeResizeMock = vi.fn();
    disconnectResizeMock = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn().mockImplementation((cb: ResizeObserverCallback) => {
        resizeObserverCallback = cb;
        return {
          observe: observeResizeMock,
          unobserve: vi.fn(),
          disconnect: disconnectResizeMock,
        };
      })
    );

    // Mock IntersectionObserver
    observeIntersectionMock = vi.fn();
    disconnectIntersectionMock = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
        intersectionObserverCallback = cb;
        return {
          observe: observeIntersectionMock,
          unobserve: vi.fn(),
          disconnect: disconnectIntersectionMock,
        };
      })
    );

    // Mock MutationObserver
    observeMutationMock = vi.fn();
    disconnectMutationMock = vi.fn();
    vi.stubGlobal(
      "MutationObserver",
      vi.fn().mockImplementation((cb: MutationCallback) => {
        mutationObserverCallback = cb;
        return {
          observe: observeMutationMock,
          disconnect: disconnectMutationMock,
          takeRecords: vi.fn(() => []),
        };
      })
    );

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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("TopicChips Dimension Mode Toggle", () => {
    const mockTopics = topicsConfig.topics;

    it("renders 2D and 3D toggle buttons when viewMode is map and onDimensionModeChange is provided", () => {
      const handleDimensionChange = vi.fn();

      render(
        <TopicChips
          topics={mockTopics}
          activeTopicId={null}
          onSelectTopic={vi.fn()}
          viewMode="map"
          onViewModeChange={vi.fn()}
          dimensionMode="2d"
          onDimensionModeChange={handleDimensionChange}
        />
      );

      const btn2D = screen.getByRole("button", { name: siteConfig.ui.viewMode2dLabel });
      const btn3D = screen.getByRole("button", { name: siteConfig.ui.viewMode3dLabel });

      expect(btn2D).toBeInTheDocument();
      expect(btn3D).toBeInTheDocument();
      expect(btn2D).toHaveAttribute("aria-pressed", "true");
      expect(btn3D).toHaveAttribute("aria-pressed", "false");
      expect(btn2D.className).toContain("bg-lime");
    });

    it("calls onDimensionModeChange with 3d when 3D button is clicked", () => {
      const handleDimensionChange = vi.fn();

      render(
        <TopicChips
          topics={mockTopics}
          activeTopicId={null}
          onSelectTopic={vi.fn()}
          viewMode="map"
          onViewModeChange={vi.fn()}
          dimensionMode="2d"
          onDimensionModeChange={handleDimensionChange}
        />
      );

      const btn3D = screen.getByRole("button", { name: siteConfig.ui.viewMode3dLabel });
      fireEvent.click(btn3D);

      expect(handleDimensionChange).toHaveBeenCalledWith("3d");
    });

    it("does not render dimension toggle when viewMode is list", () => {
      render(
        <TopicChips
          topics={mockTopics}
          activeTopicId={null}
          onSelectTopic={vi.fn()}
          viewMode="list"
          onViewModeChange={vi.fn()}
          dimensionMode="2d"
          onDimensionModeChange={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: siteConfig.ui.viewMode2dLabel })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: siteConfig.ui.viewMode3dLabel })).not.toBeInTheDocument();
    });

    it("does not render dimension toggle when onDimensionModeChange is not provided", () => {
      render(
        <TopicChips
          topics={mockTopics}
          activeTopicId={null}
          onSelectTopic={vi.fn()}
          viewMode="map"
          onViewModeChange={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: siteConfig.ui.viewMode2dLabel })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: siteConfig.ui.viewMode3dLabel })).not.toBeInTheDocument();
    });
  });

  describe("NetworkMap3D Mounting & Accessibility", () => {
    it("renders canvas with region role, tabIndex=0, and aria-label", () => {
      render(<NetworkMap3D posts={mockPosts} />);

      const canvas = screen.getByRole("region", { name: "Interactive neural network map" });
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute("tabIndex", "0");
      expect(canvas.tagName.toLowerCase()).toBe("canvas");
    });

    it("applies custom ariaLabel and className", () => {
      render(
        <NetworkMap3D
          posts={mockPosts}
          ariaLabel="Custom 3D topology"
          className="custom-3d-stage"
        />
      );

      const canvas = screen.getByRole("region", { name: "Custom 3D topology" });
      expect(canvas).toBeInTheDocument();
      expect(canvas.parentElement?.className).toContain("custom-3d-stage");
      expect(canvas.parentElement?.className).toContain("touch-pan-y");
    });
  });

  describe("NetworkMap3D Lifecycle & Observers", () => {
    it("disposes renderer cleanly on unmount", () => {
      const disposeSpy = vi.spyOn(ThreeNetworkRenderer.prototype, "dispose");
      const { unmount } = render(<NetworkMap3D posts={mockPosts} />);

      unmount();

      expect(disposeSpy).toHaveBeenCalled();
      expect(cancelRafMock).toHaveBeenCalled();
      expect(disconnectResizeMock).toHaveBeenCalled();
      expect(disconnectIntersectionMock).toHaveBeenCalled();
      expect(disconnectMutationMock).toHaveBeenCalled();
    });

    it("resizes renderer when ResizeObserver fires", () => {
      const resizeSpy = vi.spyOn(ThreeNetworkRenderer.prototype, "resize");
      render(<NetworkMap3D posts={mockPosts} />);

      expect(observeResizeMock).toHaveBeenCalled();

      act(() => {
        resizeObserverCallback?.(
          [
            {
              contentRect: { width: 1024, height: 768 } as DOMRectReadOnly,
            } as ResizeObserverEntry,
          ],
          {} as ResizeObserver
        );
      });

      expect(resizeSpy).toHaveBeenCalledWith(1024, 768, expect.any(Number));
    });

    it("pauses render loop when IntersectionObserver indicates off-screen", () => {
      render(<NetworkMap3D posts={mockPosts} />);

      act(() => {
        intersectionObserverCallback?.(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });

      expect(cancelRafMock).toHaveBeenCalled();
    });

    it("pauses render loop when document visibility changes to hidden", () => {
      render(<NetworkMap3D posts={mockPosts} />);

      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(cancelRafMock).toHaveBeenCalled();

      // Resume when visible
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(rafCallbacks.length).toBeGreaterThan(0);
    });

    it("updates theme colors when MutationObserver detects documentElement change", () => {
      const readThemeSpy = vi.spyOn(
        ThreeNetworkRenderer.prototype,
        "readThemeColorsFromComputedStyle"
      );
      render(<NetworkMap3D posts={mockPosts} />);

      expect(observeMutationMock).toHaveBeenCalled();

      act(() => {
        mutationObserverCallback?.(
          [{ type: "attributes", attributeName: "data-theme" } as MutationRecord],
          {} as MutationObserver
        );
      });

      expect(readThemeSpy).toHaveBeenCalled();
    });
  });

  describe("NetworkMap3D Pointer Interactions", () => {
    it("updates cursor on pointer move based on picked neuron", () => {
      render(<NetworkMap3D posts={mockPosts} />);
      const canvas = screen.getByRole("region");

      vi.spyOn(ThreeNetworkRenderer.prototype, "pickNeuron").mockReturnValueOnce({
        id: "post-1",
        label: "Post 1",
        topicId: "agents",
        isPost: true,
        x: 100,
        y: 100,
        baseX: 100,
        baseY: 100,
        vx: 0,
        vy: 0,
        layer: 2,
        born: 0,
        ins: [],
        out: [],
        post: mockPosts[0],
      } as any);

      fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200 });
      expect(canvas.style.cursor).toBe("pointer");

      vi.spyOn(ThreeNetworkRenderer.prototype, "pickNeuron").mockReturnValueOnce(null);
      fireEvent.pointerMove(canvas, { clientX: 10, clientY: 10 });
      expect(canvas.style.cursor).toBe("default");
    });

    it("selects post and plays sound when post neuron is clicked", () => {
      const handleSelectPost = vi.fn();
      render(<NetworkMap3D posts={mockPosts} onSelectPost={handleSelectPost} />);
      const canvas = screen.getByRole("region");

      vi.spyOn(ThreeNetworkRenderer.prototype, "pickNeuron").mockReturnValue({
        id: "post-1",
        label: "Post 1",
        topicId: "agents",
        isPost: true,
        x: 100,
        y: 100,
        baseX: 100,
        baseY: 100,
        vx: 0,
        vy: 0,
        layer: 2,
        born: 0,
        ins: [],
        out: [],
        post: mockPosts[0],
      } as any);

      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200 });
      fireEvent.pointerUp(canvas, { clientX: 200, clientY: 200 });

      expect(handleSelectPost).toHaveBeenCalledWith("post-agents-1");
      expect(playSoundMock).toHaveBeenCalledWith("select");
    });

    it("skips post selection when dragging to orbit the 3D stage", () => {
      const handleSelectPost = vi.fn();
      render(<NetworkMap3D posts={mockPosts} onSelectPost={handleSelectPost} />);
      const canvas = screen.getByRole("region");

      vi.spyOn(ThreeNetworkRenderer.prototype, "pickNeuron").mockReturnValue({
        id: "post-1",
        label: "Post 1",
        topicId: "agents",
        isPost: true,
        x: 100,
        y: 100,
        baseX: 100,
        baseY: 100,
        vx: 0,
        vy: 0,
        layer: 2,
        born: 0,
        ins: [],
        out: [],
        post: mockPosts[0],
      } as any);

      // Start drag at (100, 100)
      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      // Move 40px (well above 5px drag threshold)
      fireEvent.pointerMove(canvas, { clientX: 140, clientY: 140 });
      // Release drag
      fireEvent.pointerUp(canvas, { clientX: 140, clientY: 140 });

      // Was a drag orbit, so selection should have been skipped!
      expect(handleSelectPost).not.toHaveBeenCalled();
    });

    it("renders Reset View button with siteConfig.ui.resetCameraLabel and calls resetCamera on click", () => {
      const resetSpy = vi.spyOn(ThreeNetworkRenderer.prototype, "resetCamera");
      render(<NetworkMap3D posts={mockPosts} />);

      const resetBtn = screen.getByRole("button", {
        name: siteConfig.ui.resetCameraLabel,
      });
      expect(resetBtn).toBeInTheDocument();

      fireEvent.click(resetBtn);

      expect(resetSpy).toHaveBeenCalledTimes(1);
      expect(playSoundMock).toHaveBeenCalledWith("tick");
    });
  });

  describe("NetworkMap3D Keyboard Navigation & Audio Feedback", () => {
    it("cycles through interactive post neurons on ArrowDown/ArrowRight and selects on Enter", () => {
      const handleSelectPost = vi.fn();

      render(
        <NetworkMap3D
          posts={mockPosts}
          onSelectPost={handleSelectPost}
        />
      );

      const canvas = screen.getByRole("region");
      canvas.focus();

      // Press ArrowDown to focus first post neuron
      fireEvent.keyDown(canvas, { key: "ArrowDown" });
      // Press Enter to select
      fireEvent.keyDown(canvas, { key: "Enter" });

      expect(handleSelectPost).toHaveBeenCalledWith("post-agents-1");
      expect(playSoundMock).toHaveBeenCalledWith("select");

      // Press ArrowRight to cycle to next post neuron
      fireEvent.keyDown(canvas, { key: "ArrowRight" });
      // Press Space to select
      fireEvent.keyDown(canvas, { key: " " });

      expect(handleSelectPost).toHaveBeenCalledWith("post-rag-1");
    });

    it("cycles backward on ArrowUp/ArrowLeft and wraps around", () => {
      const handleSelectPost = vi.fn();

      render(
        <NetworkMap3D
          posts={mockPosts}
          onSelectPost={handleSelectPost}
        />
      );

      const canvas = screen.getByRole("region");
      canvas.focus();

      // Press ArrowUp when at index 0 wraps to last neuron
      fireEvent.keyDown(canvas, { key: "ArrowUp" });
      fireEvent.keyDown(canvas, { key: "Enter" });

      expect(handleSelectPost).toHaveBeenCalledWith("post-tune-1");
    });

    it("clears selection when Escape is pressed", () => {
      const handleSelectPost = vi.fn();

      render(
        <NetworkMap3D
          posts={mockPosts}
          selectedPostSlug="post-agents-1"
          onSelectPost={handleSelectPost}
        />
      );

      const canvas = screen.getByRole("region");
      canvas.focus();

      fireEvent.keyDown(canvas, { key: "Escape" });
      expect(handleSelectPost).toHaveBeenCalledWith(null);
    });
  });

  describe("NetworkMap3D Preview Card Integration", () => {
    it("renders PostPreviewCard when selectedPostSlug is provided", () => {
      const handleSelect = vi.fn();

      render(
        <NetworkMap3D
          posts={mockPosts}
          selectedPostSlug="post-agents-1"
          onSelectPost={handleSelect}
        />
      );

      expect(screen.getByText("Evaluating Multi-Agent Systems")).toBeInTheDocument();
      expect(
        screen.getByText("Benchmarking trajectory divergence in complex tool use.")
      ).toBeInTheDocument();

      const closeButton = screen.getByRole("button", { name: "Close post preview" });
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(handleSelect).toHaveBeenCalledWith(null);
    });
  });
});
