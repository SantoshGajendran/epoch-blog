import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { topicsConfig, graphConfig } from "@config/index";
import { buildNetworkGraph } from "@/lib/network/builder";
import type { Post, NetworkGraph } from "@/lib/network/types";
import { ThreeNetworkRenderer } from "@/lib/network/three-renderer";

const { MockWebGLRenderer } = vi.hoisted(() => {
  class MockWebGLRenderer {
    domElement: HTMLCanvasElement;
    pixelRatio: number = 1;
    width: number = 800;
    height: number = 600;

    constructor(parameters?: { canvas?: HTMLCanvasElement }) {
      this.domElement =
        parameters?.canvas || (document.createElement("canvas") as HTMLCanvasElement);
    }

    setPixelRatio = vi.fn((dpr: number) => {
      this.pixelRatio = dpr;
    });

    setSize = vi.fn((width: number, height: number, _updateStyle?: boolean) => {
      this.width = width;
      this.height = height;
    });

    render = vi.fn();
    dispose = vi.fn();
    forceContextLoss = vi.fn();
  }
  return { MockWebGLRenderer };
});

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

function createMockCanvas(): HTMLCanvasElement {
  const canvas = {
    width: 800,
    height: 600,
    style: {
      width: "800px",
      height: "600px",
      cursor: "default",
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    })),
  };
  return canvas as unknown as HTMLCanvasElement;
}

const createMockPost = (slug: string, topic: string): Post => ({
  slug,
  title: `Post ${slug}`,
  summary: `Summary for ${slug}`,
  date: "2026-03-01T00:00:00Z",
  topic,
  tags: [],
  permalink: `/posts/${slug}`,
  readingTime: 4,
  draft: false,
  toc: [],
  body: "",
  metadata: { readingTime: 4, wordCount: 800 },
});

describe("ThreeNetworkRenderer Orbit, Zoom & Reset Camera", () => {
  let canvas: HTMLCanvasElement;
  let renderer: ThreeNetworkRenderer;
  let sampleGraph: NetworkGraph;

  beforeEach(() => {
    canvas = createMockCanvas();
    renderer = new ThreeNetworkRenderer(canvas, graphConfig);
    const mockPosts = [
      createMockPost("agent-1", "agents"),
      createMockPost("rag-1", "rag"),
    ];
    sampleGraph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);
    renderer.setGraph(sampleGraph);
    renderer.resize(800, 600, 1);
  });

  afterEach(() => {
    renderer.dispose();
    vi.restoreAllMocks();
  });

  it("distinguishes drag orbit from click based on distance threshold", () => {
    // Pure click without movement
    renderer.startOrbit(100, 100);
    const wasClick = renderer.endOrbit();
    expect(wasClick).toBe(false);

    // Micro movement (1.41px < 5px threshold)
    renderer.startOrbit(100, 100);
    renderer.updateOrbit(101, 101);
    const wasMicroMove = renderer.endOrbit();
    expect(wasMicroMove).toBe(false);

    // Deliberate drag (28.28px >= 5px threshold)
    renderer.startOrbit(100, 100);
    renderer.updateOrbit(120, 120);
    const wasDrag = renderer.endOrbit();
    expect(wasDrag).toBe(true);
  });

  it("clamps wheel zoom distance within min and max distance ratios", () => {
    const baseDist = renderer.getBaseDistance();
    expect(baseDist).toBeGreaterThan(0);

    // Zoom in drastically beyond lower bound
    for (let i = 0; i < 50; i++) {
      renderer.handleZoom(-100);
    }
    const minDist = baseDist * graphConfig.three.minDistanceRatio;
    expect(renderer.getCameraDistance()).toBeGreaterThanOrEqual(minDist - 1);
    expect(renderer.getCameraDistance()).toBeCloseTo(minDist, 1);

    // Zoom out drastically beyond upper bound
    for (let i = 0; i < 50; i++) {
      renderer.handleZoom(100);
    }
    const maxDist = baseDist * graphConfig.three.maxDistanceRatio;
    expect(renderer.getCameraDistance()).toBeLessThanOrEqual(maxDist + 1);
    expect(renderer.getCameraDistance()).toBeCloseTo(maxDist, 1);
  });

  it("resets camera coordinates to default on resetCamera()", () => {
    renderer.startOrbit(100, 100);
    renderer.updateOrbit(300, 300);
    renderer.endOrbit();

    renderer.resetCamera();
    expect(renderer.isCameraResetting()).toBe(true);

    // Render initial frame of reset animation
    renderer.render(16, 1000, false);
    expect(renderer.isCameraResetting()).toBe(true);

    // Render completion frame beyond ~700ms reset duration
    renderer.render(16, 1800, false);
    expect(renderer.isCameraResetting()).toBe(false);
    expect(renderer.getCameraDistance()).toBeCloseTo(renderer.getBaseDistance(), 1);
  });

  it("governs 3D camera position using spherical coordinates looking at scene center", () => {
    const baseDist = renderer.getBaseDistance();
    // Default initial frame at theta=0, phi=PI/2
    renderer.render(16, 1000, false);

    const camera = renderer.getCamera();
    // Position should be (0, 0, baseDist) before any user orbit
    expect(camera.position.x).toBeCloseTo(0, 1);
    expect(camera.position.y).toBeCloseTo(0, 1);
    expect(camera.position.z).toBeCloseTo(baseDist, 1);

    // Orbit by dragging pointer
    renderer.startOrbit(200, 200);
    renderer.updateOrbit(300, 200); // Dragging right
    renderer.endOrbit();

    // Render next frames to lerp damping
    for (let i = 0; i < 60; i++) {
      renderer.render(16, 1000 + i * 16, false);
    }

    // Position X should now have deviated from 0
    expect(camera.position.x).not.toBeCloseTo(0, 1);
  });

  it("applies orbit and zoom directly without damping under isReducedMotion: true", () => {
    renderer.startOrbit(100, 100);
    renderer.updateOrbit(200, 150);
    renderer.endOrbit();
    renderer.handleZoom(-50);

    // Render single frame with isReducedMotion = true
    renderer.render(16, 1000, true);

    const camera = renderer.getCamera();
    // Camera position should have immediately snapped to target radius
    const distance = Math.hypot(camera.position.x, camera.position.y, camera.position.z);
    expect(distance).toBeCloseTo(renderer.getCameraDistance(), 1);
  });
});
