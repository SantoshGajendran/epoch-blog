import { describe, it, expect, vi, beforeEach } from "vitest";
import { topicsConfig, graphConfig } from "@config/index";
import { buildNetworkGraph } from "@/lib/network/builder";
import { SignalSystem } from "@/lib/network/signals";
import {
  NetworkRenderer,
  readThemeColorsFromComputedStyle,
  computeNeuronDim,
  computeNeuronVisibility,
  hexToRgba,
  type RenderState,
} from "@/lib/network/renderer";
import type { Neuron, ThemeColors, Post } from "@/lib/network/types";

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
  return ctx as unknown as CanvasRenderingContext2D & { _calls: typeof calls };
}

function createMockCanvas(ctx?: CanvasRenderingContext2D) {
  const canvas = {
    width: 800,
    height: 600,
    style: {
      width: "800px",
      height: "600px",
    },
    getContext: vi.fn((type: string) => {
      if (type === "2d") return ctx ?? createMockContext();
      return null;
    }),
  };
  return canvas as unknown as HTMLCanvasElement;
}

const createMockPost = (
  overrides: Partial<Post> & { title: string; slug: string; topic: string; draft?: boolean }
): Post => ({
  permalink: `/posts/${overrides.slug}`,
  summary: `Summary for ${overrides.title}`,
  date: "2026-03-01T00:00:00Z",
  tags: [],
  draft: overrides.draft ?? false,
  readingTime: 4,
  toc: [],
  body: "",
  metadata: { readingTime: 4, wordCount: 800 },
  ...overrides,
});

const mockPosts: Post[] = [
  createMockPost({
    slug: "post-agents-1",
    title: "Agent Reasoning Patterns",
    topic: "agents",
    readingTime: 5,
  }),
  createMockPost({
    slug: "post-rag-1",
    title: "Graph RAG Evaluation",
    topic: "rag",
    readingTime: 7,
  }),
];

describe("NetworkRenderer", () => {
  let mockCtx: CanvasRenderingContext2D & { _calls: { method: string; args: unknown[] }[] };
  let mockCanvas: HTMLCanvasElement;
  let renderer: NetworkRenderer;

  beforeEach(() => {
    mockCtx = createMockContext();
    mockCanvas = createMockCanvas(mockCtx);
    renderer = new NetworkRenderer(mockCanvas);
  });

  describe("DPR and Resizing", () => {
    it("caps DPR calculation at 2 even when devicePixelRatio is higher", () => {
      renderer.resize(800, 600, 3);
      expect(renderer.getDpr()).toBe(2);
      expect(mockCanvas.width).toBe(1600);
      expect(mockCanvas.height).toBe(1200);
      expect(mockCanvas.style.width).toBe("800px");
      expect(mockCanvas.style.height).toBe("600px");
      expect(mockCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    });

    it("respects fractional DPR when under 2", () => {
      renderer.resize(600, 400, 1.25);
      expect(renderer.getDpr()).toBe(1.25);
      expect(mockCanvas.width).toBe(750);
      expect(mockCanvas.height).toBe(500);
      expect(mockCtx.setTransform).toHaveBeenCalledWith(1.25, 0, 0, 1.25, 0, 0);
    });

    it("defaults to window.devicePixelRatio capped at 2 when DPR is not provided", () => {
      const originalDpr = window.devicePixelRatio;
      Object.defineProperty(window, "devicePixelRatio", { value: 2.5, configurable: true });

      renderer.resize(500, 500);
      expect(renderer.getDpr()).toBe(2);

      Object.defineProperty(window, "devicePixelRatio", { value: originalDpr, configurable: true });
    });
  });

  describe("Hit Testing: pickNeuron", () => {
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);

    it("returns null when graph has not been loaded or rendered", () => {
      const picked = renderer.pickNeuron(100, 100);
      expect(picked).toBeNull();
    });

    it("identifies closest post neuron within the 24px threshold radius", () => {
      // Position the post neurons at known coordinates
      const agentPost = graph.postNeurons.find((n) => n.topicId === "agents")!;
      agentPost.x = 200;
      agentPost.y = 150;

      const ragPost = graph.postNeurons.find((n) => n.topicId === "rag")!;
      ragPost.x = 400;
      ragPost.y = 300;

      // Click 10px away from agentPost (within 24px)
      const hit = renderer.pickNeuron(208, 156, null, graph);
      expect(hit).toBeDefined();
      expect(hit?.id).toBe(agentPost.id);
      expect(hit?.isPost).toBe(true);
    });

    it("returns null when click is beyond threshold radius for all post neurons", () => {
      const agentPost = graph.postNeurons.find((n) => n.topicId === "agents")!;
      agentPost.x = 200;
      agentPost.y = 150;

      // Click 50px away
      const hit = renderer.pickNeuron(250, 150, null, graph);
      expect(hit).toBeNull();
    });

    it("ignores decorative (non-post) neurons even if click is right on top of them", () => {
      const decorativeNeuron = graph.neurons.find((n) => !n.isPost)!;
      decorativeNeuron.x = 100;
      decorativeNeuron.y = 100;

      // Click exactly at decorative neuron position
      const hit = renderer.pickNeuron(100, 100, null, graph);
      expect(hit).toBeNull();
    });

    it("filters out post neurons that do not match activeTopicId", () => {
      const agentPost = graph.postNeurons.find((n) => n.topicId === "agents")!;
      agentPost.x = 200;
      agentPost.y = 150;

      // Click near agent post, but with 'rag' filter active
      const hit = renderer.pickNeuron(205, 150, "rag", graph);
      expect(hit).toBeNull();

      // Click near agent post with 'agents' filter active -> matched
      const hitAgents = renderer.pickNeuron(205, 150, "agents", graph);
      expect(hitAgents?.id).toBe(agentPost.id);
    });

    it("uses last rendered graph if graph argument is omitted", () => {
      const agentPost = graph.postNeurons.find((n) => n.topicId === "agents")!;
      agentPost.x = 200;
      agentPost.y = 150;

      renderer.render({
        graph,
        dimensions: { width: 800, height: 600 },
      });

      const hit = renderer.pickNeuron(205, 150);
      expect(hit?.id).toBe(agentPost.id);
    });
  });

  describe("Theme Colors Integration", () => {
    it("extracts CSS variables from computed style with defaults", () => {
      const mockStyle = {
        getPropertyValue: vi.fn((prop: string) => {
          switch (prop) {
            case "--bg":
              return "#112233";
            case "--surf":
              return "#223344";
            case "--ink":
              return "#eef2f5";
            case "--mut":
              return "#8899aa";
            case "--a":
              return "#00ccff";
            case "--lime":
              return "#ccff00";
            case "--line":
              return "#334455";
            case "--c-agents":
              return "#11aaff";
            default:
              return "";
          }
        }),
      } as unknown as CSSStyleDeclaration;

      const colors = readThemeColorsFromComputedStyle(mockStyle, topicsConfig.topics);

      expect(colors.background).toBe("#112233");
      expect(colors.surface).toBe("#223344");
      expect(colors.ink).toBe("#eef2f5");
      expect(colors.muted).toBe("#8899aa");
      expect(colors.accent).toBe("#00ccff");
      expect(colors.lime).toBe("#ccff00");
      expect(colors.line).toBe("#334455");
      expect(colors.topicColors.agents).toBe("#11aaff");
      // Fallback for rag when not in mockStyle
      expect(colors.topicColors.rag).toBe(topicsConfig.topics.find((t) => t.id === "rag")!.darkColor);
    });

    it("falls back to resilient dark theme values if computed style is empty", () => {
      const emptyStyle = {
        getPropertyValue: vi.fn(() => ""),
      } as unknown as CSSStyleDeclaration;

      const colors = readThemeColorsFromComputedStyle(emptyStyle, topicsConfig.topics);

      expect(colors.background).toBe("#14181c");
      expect(colors.surface).toBe("#1c2227");
      expect(colors.ink).toBe("#e8eef3");
      expect(colors.muted).toBe("#93a1ad");
      expect(colors.accent).toBe("#6fd3ff");
      expect(colors.lime).toBe("#c8f43a");
      expect(colors.line).toBe("#2b343c");
      expect(colors.topicColors.agents).toBeDefined();
    });

    it("updates renderer theme colors with setThemeColors", () => {
      const customColors: ThemeColors = {
        background: "#000000",
        surface: "#111111",
        ink: "#ffffff",
        muted: "#777777",
        accent: "#ff0077",
        lime: "#00ff77",
        line: "#333333",
        topicColors: { agents: "#ff0077", rag: "#00ff77" },
      };

      renderer.setThemeColors(customColors);
      expect(renderer.getThemeColors().accent).toBe("#ff0077");
    });
  });

  describe("Dimming and Visibility Logic", () => {
    const neuron: Neuron = {
      id: "n-test",
      topicId: "agents",
      clusterIndex: 0,
      layer: 1,
      row: 0,
      rowCount: 2,
      isPost: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      f: 0,
      born: 100,
      out: [],
      ins: [],
    };

    it("computes dim factor 1.0 when no filter is active", () => {
      expect(computeNeuronDim(neuron, null)).toBe(1.0);
      expect(computeNeuronDim(neuron, undefined)).toBe(1.0);
    });

    it("computes dim factor 1.0 when neuron matches activeTopicId", () => {
      expect(computeNeuronDim(neuron, "agents")).toBe(1.0);
    });

    it("computes dim factor 0.14 when neuron does not match activeTopicId", () => {
      expect(computeNeuronDim(neuron, "rag")).toBe(0.14);
    });

    it("computes neuron visibility fading in over 600ms", () => {
      // Before born -> 0
      expect(computeNeuronVisibility(neuron, 50, false)).toBe(0);

      // Halfway (300ms after born 100 -> now = 400) -> 0.5
      expect(computeNeuronVisibility(neuron, 400, false)).toBeCloseTo(0.5, 2);

      // Fully visible after 600ms (now = 700) -> 1.0
      expect(computeNeuronVisibility(neuron, 700, false)).toBe(1.0);

      // In reduced motion, visibility is always 1.0
      expect(computeNeuronVisibility(neuron, 50, true)).toBe(1.0);
    });
  });

  describe("Canvas 2D Rendering Pipeline", () => {
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);
    const signalSystem = new SignalSystem(graphConfig);

    it("executes standard render loop without errors", () => {
      signalSystem.spawnAmbientSignal(graph);

      const agentPost = graph.postNeurons[0];
      const ragPost = graph.postNeurons[1];

      const renderState: RenderState = {
        graph,
        signals: signalSystem.signals,
        mouse: { x: 300, y: 250 },
        selectedNeuron: agentPost,
        hoveredNeuron: ragPost,
        activeTopicId: null,
        isReducedMotion: false,
        dimensions: { width: 800, height: 600 },
        now: 2000,
      };

      expect(() => renderer.render(renderState)).not.toThrow();
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it("renders hover tooltip when hovered post neuron is provided", () => {
      const agentPost = graph.postNeurons[0];

      const renderState: RenderState = {
        graph,
        hoveredNeuron: agentPost,
        dimensions: { width: 800, height: 600 },
        now: 1500,
      };

      renderer.render(renderState);

      // Tooltip renders the post title
      const titleCalls = (mockCtx.fillText as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: unknown[]) => call[0] === agentPost.post!.title
      );
      expect(titleCalls.length).toBeGreaterThan(0);
    });

    it("skips signals, ripples, and cursor glow under isReducedMotion", () => {
      signalSystem.spawnAmbientSignal(graph);
      const agentPost = graph.postNeurons[0];

      mockCtx._calls.length = 0;

      const renderState: RenderState = {
        graph,
        signals: signalSystem.signals,
        mouse: { x: 300, y: 250 },
        selectedNeuron: agentPost,
        isReducedMotion: true,
        dimensions: { width: 800, height: 600 },
        now: 2000,
      };

      renderer.render(renderState);

      // Radial cursor gradient should not be called in reduced motion
      expect(mockCtx.createRadialGradient).not.toHaveBeenCalled();

      // Tooltips and clusters are still drawn
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it("renders burst ripple for selected neuron when standard motion is enabled", () => {
      const agentPost = graph.postNeurons[0];
      mockCtx._calls.length = 0;

      renderer.render({
        graph,
        selectedNeuron: agentPost,
        isReducedMotion: false,
        dimensions: { width: 800, height: 600 },
        now: 1000,
      });

      // Next frame advances ripple
      renderer.render({
        graph,
        selectedNeuron: agentPost,
        isReducedMotion: false,
        dimensions: { width: 800, height: 600 },
        now: 1200,
      });

      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it("renders smoothly within 16ms frame budget (60fps) with 50+ posts", () => {
      const largePosts: Post[] = Array.from({ length: 60 }, (_, i) =>
        createMockPost({
          title: `Post ${i}`,
          slug: `post-${i}`,
          topic: topicsConfig.topics[i % topicsConfig.topics.length].id,
          tags: ["ai"],
          readingTime: 5,
        })
      );

      const largeGraph = buildNetworkGraph(topicsConfig.topics, graphConfig, largePosts);
      const start = performance.now();
      for (let frame = 0; frame < 10; frame++) {
        renderer.render({
          graph: largeGraph,
          selectedNeuron: largeGraph.postNeurons[0],
          isReducedMotion: false,
          dimensions: { width: 1200, height: 800 },
          now: 1000 + frame * 16,
        });
      }
      const avgElapsedMs = (performance.now() - start) / 10;
      expect(avgElapsedMs).toBeLessThan(16);
    });
  });

  describe("Color utility helper", () => {
    it("converts hex to rgba string accurately", () => {
      expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
      expect(hexToRgba("#00ff00", 1)).toBe("rgba(0, 255, 0, 1)");
      expect(hexToRgba("#0000ff", 0)).toBe("rgba(0, 0, 255, 0)");
      expect(hexToRgba("#fff", 0.2)).toBe("rgba(255, 255, 255, 0.2)");
    });
  });
});
