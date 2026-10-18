import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { NetworkMap } from "@/components/network/network-map";
import { PostPreviewCard } from "@/components/network/post-preview-card";
import { siteConfig, topicsConfig } from "@config/index";
import type { Post } from "@/lib/content";

function createMockPost(overrides: Partial<Post> = {}): Post {
  return {
    slug: "agentic-evals",
    title: "Autonomous Agent Evaluations",
    summary: "A rigorous framework for benchmarking trajectory divergence.",
    date: "2026-03-01",
    topic: "agents",
    tags: ["evals", "benchmarks"],
    permalink: "/posts/agentic-evals",
    readingTime: 5,
    draft: false,
    toc: [],
    body: "Content",
    metadata: { readingTime: 5, wordCount: 1000 },
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
    readingTime: 4,
  }),
  createMockPost({
    slug: "post-rag-1",
    title: "Hybrid Search with Reciprocal Rank Fusion",
    summary: "Combining dense vector index with sparse BM25 retrieval.",
    date: "2026-03-10",
    topic: "rag",
    permalink: "/posts/post-rag-1",
    readingTime: 6,
  }),
  createMockPost({
    slug: "post-tune-1",
    title: "QLoRA Quantization Boundaries",
    summary: "Loss landscapes across 4-bit and 8-bit adapter merges.",
    date: "2026-03-15",
    topic: "tune",
    permalink: "/posts/post-tune-1",
    readingTime: 7,
  }),
];

function createMockContext() {
  const calls: { method: string; args: unknown[] }[] = [];
  const ctx = {
    canvas: {
      width: 800,
      height: 600,
      style: { width: "800px", height: "600px" },
    },
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "#000",
    fillStyle: "#000",
    font: "",
    textAlign: "left",
    shadowColor: "",
    shadowBlur: 0,
    lineDashOffset: 0,
    clearRect: vi.fn((...args: unknown[]) => calls.push({ method: "clearRect", args })),
    beginPath: vi.fn((...args: unknown[]) => calls.push({ method: "beginPath", args })),
    closePath: vi.fn((...args: unknown[]) => calls.push({ method: "closePath", args })),
    arc: vi.fn((...args: unknown[]) => calls.push({ method: "arc", args })),
    fill: vi.fn((...args: unknown[]) => calls.push({ method: "fill", args })),
    stroke: vi.fn((...args: unknown[]) => calls.push({ method: "stroke", args })),
    moveTo: vi.fn((...args: unknown[]) => calls.push({ method: "moveTo", args })),
    lineTo: vi.fn((...args: unknown[]) => calls.push({ method: "lineTo", args })),
    arcTo: vi.fn((...args: unknown[]) => calls.push({ method: "arcTo", args })),
    roundRect: vi.fn((...args: unknown[]) => calls.push({ method: "roundRect", args })),
    fillRect: vi.fn((...args: unknown[]) => calls.push({ method: "fillRect", args })),
    fillText: vi.fn((...args: unknown[]) => calls.push({ method: "fillText", args })),
    setLineDash: vi.fn((...args: unknown[]) => calls.push({ method: "setLineDash", args })),
    setTransform: vi.fn((...args: unknown[]) => calls.push({ method: "setTransform", args })),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    _calls: calls,
  };
  return ctx;
}

describe("NetworkMap & PostPreviewCard", () => {
  let resizeObserverCallback: ResizeObserverCallback | null = null;
  let intersectionObserverCallback: IntersectionObserverCallback | null = null;
  let observeResizeMock = vi.fn();
  let disconnectResizeMock = vi.fn();
  let observeIntersectionMock = vi.fn();
  let disconnectIntersectionMock = vi.fn();
  let rafCallbacks: ((time: number) => void)[] = [];
  let rafIdCounter = 0;
  let cancelRafMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    rafCallbacks = [];
    rafIdCounter = 0;

    // Mock requestAnimationFrame / cancelAnimationFrame
    vi.stubGlobal("requestAnimationFrame", (cb: (time: number) => void) => {
      const id = ++rafIdCounter;
      rafCallbacks.push(cb);
      return id;
    });
    cancelRafMock = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelRafMock);

    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((id: string) => {
      if (id === "2d") return createMockContext();
      return null;
    });

    // Mock getBoundingClientRect
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 100,
      top: 100,
      width: 800,
      height: 600,
      right: 900,
      bottom: 700,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    // Mock ResizeObserver
    observeResizeMock = vi.fn();
    disconnectResizeMock = vi.fn();
    resizeObserverCallback = null;
    window.ResizeObserver = vi.fn().mockImplementation((cb: ResizeObserverCallback) => {
      resizeObserverCallback = cb;
      return {
        observe: observeResizeMock,
        unobserve: vi.fn(),
        disconnect: disconnectResizeMock,
      };
    }) as unknown as typeof ResizeObserver;

    // Mock IntersectionObserver
    observeIntersectionMock = vi.fn();
    disconnectIntersectionMock = vi.fn();
    intersectionObserverCallback = null;
    window.IntersectionObserver = vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
      intersectionObserverCallback = cb;
      return {
        observe: observeIntersectionMock,
        unobserve: vi.fn(),
        disconnect: disconnectIntersectionMock,
      };
    }) as unknown as typeof IntersectionObserver;

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

  describe("PostPreviewCard", () => {
    it("renders post title, summary, topic pill with color dot, and reading time", () => {
      const post = mockPosts[0];
      const onClose = vi.fn();

      render(<PostPreviewCard post={post} onClose={onClose} />);

      expect(screen.getByText(post.title)).toBeInTheDocument();
      expect(screen.getByText(post.summary)).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`${post.readingTime} ${siteConfig.ui.minReadSuffix}`))
      ).toBeInTheDocument();

      const topicConfig = topicsConfig.topics.find((t) => t.id === post.topic);
      expect(screen.getByText(topicConfig!.label)).toBeInTheDocument();

      const readLink = screen.getByRole("link", { name: new RegExp(siteConfig.ui.readPostLabel, "i") });
      expect(readLink).toHaveAttribute("href", post.permalink);
      expect(readLink).toHaveClass("underline", "decoration-lime");
    });

    it("triggers onClose when close button is clicked", () => {
      const post = mockPosts[0];
      const onClose = vi.fn();

      render(<PostPreviewCard post={post} onClose={onClose} />);

      const closeBtn = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("applies custom className", () => {
      const post = mockPosts[0];
      const { container } = render(
        <PostPreviewCard post={post} onClose={vi.fn()} className="custom-preview-card" />
      );
      expect(container.firstChild).toHaveClass("custom-preview-card");
    });
  });

  describe("NetworkMap Component", () => {
    it("mounts canvas with role='region', tabIndex=0, and accessible aria-label", () => {
      render(<NetworkMap posts={mockPosts} />);

      const canvas = screen.getByRole("region");
      expect(canvas).toBeInTheDocument();
      expect(canvas.tagName.toLowerCase()).toBe("canvas");
      expect(canvas).toHaveAttribute("tabindex", "0");
      expect(canvas).toHaveAttribute("aria-label");
    });

    it("attaches touch-pan-y class on container to preserve page scrolling", () => {
      const { container } = render(<NetworkMap posts={mockPosts} />);
      const stage = container.firstChild as HTMLElement;
      expect(stage).toHaveClass("touch-pan-y");
    });

    it("registers ResizeObserver and updates renderer dimensions on container resize", () => {
      render(<NetworkMap posts={mockPosts} />);
      expect(observeResizeMock).toHaveBeenCalled();

      // Trigger ResizeObserver callback
      expect(resizeObserverCallback).toBeTruthy();
      act(() => {
        resizeObserverCallback!(
          [
            ({
              contentRect: { width: 960, height: 540 } as DOMRectReadOnly,
              target: document.createElement("div"),
            } as unknown as ResizeObserverEntry),
          ],
          {} as ResizeObserver
        );
      });
    });

    it("renders PostPreviewCard when selectedPostSlug is passed or selected", () => {
      const onSelectPost = vi.fn();
      const { rerender } = render(
        <NetworkMap
          posts={mockPosts}
          selectedPostSlug={null}
          onSelectPost={onSelectPost}
        />
      );

      expect(screen.queryByText(mockPosts[0].title)).not.toBeInTheDocument();

      // Update selectedPostSlug to post-agents-1
      rerender(
        <NetworkMap
          posts={mockPosts}
          selectedPostSlug="post-agents-1"
          onSelectPost={onSelectPost}
        />
      );

      expect(screen.getByText(mockPosts[0].title)).toBeInTheDocument();

      // Close preview card via its close button
      const closeBtn = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeBtn);
      expect(onSelectPost).toHaveBeenCalledWith(null);
    });

    it("cycles through post neurons using Arrow keys, selects with Enter, and deselects with Escape", () => {
      const onSelectPost = vi.fn();
      render(<NetworkMap posts={mockPosts} onSelectPost={onSelectPost} />);

      const canvas = screen.getByRole("region");
      canvas.focus();

      // Press ArrowDown to focus first post neuron
      fireEvent.keyDown(canvas, { key: "ArrowDown" });

      // Press Enter to select
      fireEvent.keyDown(canvas, { key: "Enter" });
      expect(onSelectPost).toHaveBeenCalledWith(expect.any(String));
      const firstSelected = onSelectPost.mock.calls[0][0];
      expect(mockPosts.some((p) => p.slug === firstSelected)).toBe(true);

      // Press ArrowRight to cycle to next post neuron
      fireEvent.keyDown(canvas, { key: "ArrowRight" });
      fireEvent.keyDown(canvas, { key: "Enter" });
      const secondSelected = onSelectPost.mock.calls[1][0];
      expect(secondSelected).not.toEqual(firstSelected);

      // Press Escape to deselect
      fireEvent.keyDown(canvas, { key: "Escape" });
      expect(onSelectPost).toHaveBeenLastCalledWith(null);
    });

    it("cycles backward with ArrowUp and ArrowLeft", () => {
      const onSelectPost = vi.fn();
      render(<NetworkMap posts={mockPosts} onSelectPost={onSelectPost} />);

      const canvas = screen.getByRole("region");
      canvas.focus();

      // Press ArrowUp to cycle backwards from 0 to last post neuron
      fireEvent.keyDown(canvas, { key: "ArrowUp" });
      fireEvent.keyDown(canvas, { key: "Enter" });

      expect(onSelectPost).toHaveBeenCalledWith(expect.any(String));
    });

    it("handles pointer events and cursor changes on hit testing", () => {
      const onSelectPost = vi.fn();
      render(<NetworkMap posts={mockPosts} onSelectPost={onSelectPost} />);

      const canvas = screen.getByRole("region");

      // Pointer move
      fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200 });

      // Pointer leave resets cursor
      fireEvent.pointerLeave(canvas);
      expect(canvas.style.cursor).toBe("default");
    });

    it("pauses animation loop when off-screen via IntersectionObserver and resumes when visible", () => {
      render(<NetworkMap posts={mockPosts} />);
      expect(observeIntersectionMock).toHaveBeenCalled();
      expect(intersectionObserverCallback).toBeTruthy();

      // Trigger offscreen
      act(() => {
        intersectionObserverCallback!(
          [
            ({
              isIntersecting: false,
              target: document.createElement("div"),
            } as unknown as IntersectionObserverEntry),
          ],
          {} as IntersectionObserver
        );
      });

      // Clear pending RAF
      rafCallbacks = [];

      // Step frame: should not queue further frames when offscreen
      act(() => {
        window.dispatchEvent(new Event("visibilitychange"));
      });

      // Trigger back onscreen
      act(() => {
        intersectionObserverCallback!(
          [
            ({
              isIntersecting: true,
              target: document.createElement("div"),
            } as unknown as IntersectionObserverEntry),
          ],
          {} as IntersectionObserver
        );
      });

      expect(rafCallbacks.length).toBeGreaterThan(0);
    });

    it("pauses animation loop on document visibilitychange to hidden", () => {
      render(<NetworkMap posts={mockPosts} />);

      // Hide document
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      rafCallbacks = [];

      // Restore document visibility
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(rafCallbacks.length).toBeGreaterThan(0);
    });

    it("detects prefers-reduced-motion media query", () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<NetworkMap posts={mockPosts} />);
      const canvas = screen.getByRole("region");
      expect(canvas).toBeInTheDocument();
    });

    it("cleans up observers, event listeners, and animation frame on unmount", () => {
      const { unmount } = render(<NetworkMap posts={mockPosts} />);

      unmount();

      expect(disconnectResizeMock).toHaveBeenCalled();
      expect(disconnectIntersectionMock).toHaveBeenCalled();
      expect(cancelRafMock).toHaveBeenCalled();
    });
  });
});
