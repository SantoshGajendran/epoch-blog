import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import { topicsConfig, graphConfig } from "@config/index";
import { buildNetworkGraph } from "@/lib/network/builder";
import type { Post, NetworkGraph, ThemeColors } from "@/lib/network/types";
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

type MockWebGLRendererType = InstanceType<typeof MockWebGLRenderer>;

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

const mockThemeColors: ThemeColors = {
  background: "#14181c",
  surface: "#1c2227",
  ink: "#e8eef3",
  muted: "#93a1ad",
  accent: "#6fd3ff",
  lime: "#c8f43a",
  line: "#2b343c",
  topicColors: {
    agents: "#6fd3ff",
    rag: "#50e3c2",
    tune: "#b388ff",
    infra: "#ff8a65",
  },
};

const createMockPost = (overrides: Partial<Post> & { title: string; slug: string; topic: string }): Post => ({
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

describe("ThreeNetworkRenderer (Pure Three.js 3D WebGL Neural Renderer)", () => {
  let canvas: HTMLCanvasElement;
  let sampleGraph: NetworkGraph;
  let mockPosts: Post[];

  beforeEach(() => {
    canvas = createMockCanvas();
    mockPosts = [
      createMockPost({ title: "Agent Swarms", slug: "agent-swarms", topic: "agents" }),
      createMockPost({ title: "RAG Evaluation", slug: "rag-eval", topic: "rag" }),
      createMockPost({ title: "Fine-Tuning LoRA", slug: "lora-tune", topic: "tune" }),
      createMockPost({ title: "GPU Clusters", slug: "gpu-infra", topic: "infra" }),
    ];
    sampleGraph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization & Configuration", () => {
    it("instantiates ThreeNetworkRenderer with scene, perspective camera, and WebGLRenderer", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);

      expect(renderer.getScene()).toBeInstanceOf(THREE.Scene);
      expect(renderer.getCamera()).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(renderer.getCamera().fov).toBe(graphConfig.three.cameraFov);
      expect(renderer.getRenderer()).toBeDefined();
      expect(renderer.getThemeColors()).toEqual(mockThemeColors);

      renderer.dispose();
    });

    it("calculates camera base distance to encompass the canvas dimensions at configured FOV", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);

      const fovRad = (graphConfig.three.cameraFov * Math.PI) / 180;
      const expectedZ = 300 / Math.tan(fovRad / 2);

      expect(renderer.getCamera().position.z).toBeCloseTo(expectedZ, 1);

      renderer.dispose();
    });
  });

  describe("DPR Capping and Resizing", () => {
    it("applies DPR 1 accurately when provided", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(1000, 700, 1);

      expect(renderer.getDpr()).toBe(1);
      const mockR = renderer.getRenderer() as unknown as MockWebGLRendererType;
      expect(mockR.setPixelRatio).toHaveBeenCalledWith(1);
      expect(mockR.setSize).toHaveBeenCalledWith(1000, 700, false);
      expect(renderer.getCamera().aspect).toBeCloseTo(1000 / 700, 4);

      renderer.dispose();
    });

    it("applies DPR 2 accurately when provided", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 2);

      expect(renderer.getDpr()).toBe(2);
      const mockR = renderer.getRenderer() as unknown as MockWebGLRendererType;
      expect(mockR.setPixelRatio).toHaveBeenCalledWith(2);

      renderer.dispose();
    });

    it("strictly caps DPR at 2.0 when device pixel ratio is higher (e.g. 3.0)", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 3.5);

      expect(renderer.getDpr()).toBe(2);
      const mockR = renderer.getRenderer() as unknown as MockWebGLRendererType;
      expect(mockR.setPixelRatio).toHaveBeenCalledWith(2);

      renderer.dispose();
    });

    it("defaults to window.devicePixelRatio capped at 2 when DPR is not explicitly passed", () => {
      const origDpr = window.devicePixelRatio;
      try {
        window.devicePixelRatio = 2.5;
        const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
        renderer.resize(800, 600);

        expect(renderer.getDpr()).toBe(2);
        renderer.dispose();
      } finally {
        window.devicePixelRatio = origDpr;
      }
    });
  });

  describe("2D to 3D Coordinate & Depth Mapping", () => {
    it("translates 2D center coordinates (W/2, H/2) to 3D origin (0, 0)", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);

      const targetPost = sampleGraph.postNeurons[0];
      targetPost.x = 400;
      targetPost.y = 300;

      renderer.setGraph(sampleGraph);

      const mesh = renderer.getNeuronMesh(targetPost.id);
      expect(mesh).toBeDefined();
      expect(mesh!.position.x).toBeCloseTo(0, 2);
      expect(mesh!.position.y).toBeCloseTo(0, 2);

      renderer.dispose();
    });

    it("inverts Y axis so that 2D downward pixel coordinates map to 3D Cartesian coordinates", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);

      const targetPost = sampleGraph.postNeurons[0];
      targetPost.x = 600; // +200 from center
      targetPost.y = 150; // -150 from center in 2D (above center)

      renderer.setGraph(sampleGraph);

      const mesh = renderer.getNeuronMesh(targetPost.id);
      expect(mesh).toBeDefined();
      expect(mesh!.position.x).toBeCloseTo(200, 2);
      expect(mesh!.position.y).toBeCloseTo(150, 2); // 3D Y is positive upwards

      renderer.dispose();
    });

    it("maps Z depth spread across layers according to specification", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);
      renderer.setGraph(sampleGraph);

      const depthSpread = graphConfig.three.depthSpread;

      // Layer 0 (Input): -0.3 * depthSpread
      const inputNeuron = sampleGraph.neurons.find((n) => n.layer === 0 && !n.isPost);
      expect(inputNeuron).toBeDefined();
      const inputMesh = renderer.getNeuronMesh(inputNeuron!.id);
      expect(inputMesh!.position.z).toBeCloseTo(-0.3 * depthSpread, 2);

      // Layer 1 (Hidden): -0.1 * depthSpread
      const hiddenNeuron = sampleGraph.neurons.find((n) => n.layer === 1 && !n.isPost);
      expect(hiddenNeuron).toBeDefined();
      const hiddenMesh = renderer.getNeuronMesh(hiddenNeuron!.id);
      expect(hiddenMesh!.position.z).toBeCloseTo(-0.1 * depthSpread, 2);

      // Layer 2 / Posts: +0.4 * depthSpread (pushed forward toward camera)
      const postNeuron = sampleGraph.postNeurons[0];
      const postMesh = renderer.getNeuronMesh(postNeuron.id);
      expect(postMesh!.position.z).toBeCloseTo(0.4 * depthSpread, 2);

      // Layer 3 (Output): -0.2 * depthSpread
      const outputNeuron = sampleGraph.neurons.find((n) => n.layer === 3 && !n.isPost);
      expect(outputNeuron).toBeDefined();
      const outputMesh = renderer.getNeuronMesh(outputNeuron!.id);
      expect(outputMesh!.position.z).toBeCloseTo(-0.2 * depthSpread, 2);

      renderer.dispose();
    });
  });

  describe("Visual Nodes & Synapse Generation", () => {
    it("generates prominent meshes with halo rings for post neurons, and translucent meshes for decorative neurons", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.setGraph(sampleGraph);

      for (const neuron of sampleGraph.neurons) {
        const mesh = renderer.getNeuronMesh(neuron.id);
        expect(mesh).toBeDefined();

        const halo = renderer.getNeuronHalo(neuron.id);
        if (neuron.isPost) {
          expect(halo).toBeDefined();
        } else {
          expect(halo).toBeUndefined();
        }
      }

      renderer.dispose();
    });

    it("generates 3D synapse line segments connecting graph nodes", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.setGraph(sampleGraph);

      const synapses = renderer.getSynapsesMesh();
      expect(synapses).toBeDefined();
      expect(synapses).toBeInstanceOf(THREE.LineSegments);

      const positions = synapses!.geometry.getAttribute("position");
      expect(positions).toBeDefined();
      expect(positions.count).toBe(sampleGraph.connections.length * 2);

      renderer.dispose();
    });
  });

  describe("Theme & Topic Filtering State", () => {
    it("updates material colors when setThemeColors is called", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.setGraph(sampleGraph);

      const updatedColors: ThemeColors = {
        ...mockThemeColors,
        topicColors: {
          ...mockThemeColors.topicColors,
          agents: "#00ffcc",
        },
      };

      renderer.setThemeColors(updatedColors);
      expect(renderer.getThemeColors().topicColors.agents).toBe("#00ffcc");

      renderer.dispose();
    });

    it("dims non-matching neurons and brightens matching neurons on setFilterTopic", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.setGraph(sampleGraph);

      renderer.setFilterTopic("agents");
      expect(renderer.getFilterTopic()).toBe("agents");

      const agentPost = sampleGraph.postNeurons.find((p) => p.topicId === "agents")!;
      const ragPost = sampleGraph.postNeurons.find((p) => p.topicId === "rag")!;

      const agentMesh = renderer.getNeuronMesh(agentPost.id)!;
      const ragMesh = renderer.getNeuronMesh(ragPost.id)!;

      const agentMat = agentMesh.material as THREE.Material;
      const ragMat = ragMesh.material as THREE.Material;

      expect(agentMat.opacity).toBeGreaterThan(ragMat.opacity);

      // Reset filter
      renderer.setFilterTopic(null);
      expect(renderer.getFilterTopic()).toBeNull();
      expect((ragMesh.material as THREE.Material).opacity).toBeCloseTo(1.0, 1);

      renderer.dispose();
    });

    it("activates halo ring and highlights synapses on setSelectedNeuron", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.setGraph(sampleGraph);

      const selected = sampleGraph.postNeurons[0];
      renderer.setSelectedNeuron(selected);

      expect(renderer.getSelectedNeuron()).toBe(selected);

      const halo = renderer.getNeuronHalo(selected.id)!;
      expect(halo).toBeDefined();
      const haloMat = halo.material as THREE.Material;
      expect(haloMat.opacity).toBeGreaterThan(0.5);

      renderer.dispose();
    });
  });

  describe("Raycasting & Hit Testing (pickNeuron)", () => {
    it("returns the hit post neuron when pointer intersects its 3D sphere", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);

      const targetPost = sampleGraph.postNeurons[0];
      targetPost.x = 400;
      targetPost.y = 300;
      renderer.setGraph(sampleGraph);

      const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
      const hit = renderer.pickNeuron(400, 300, rect);

      expect(hit).toBeDefined();
      expect(hit?.id).toBe(targetPost.id);

      renderer.dispose();
    });

    it("returns null when pointer misses all post neurons", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);
      renderer.setGraph(sampleGraph);

      const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
      // Coordinates far from any cluster or center
      const hit = renderer.pickNeuron(10, 10, rect);

      expect(hit).toBeNull();

      renderer.dispose();
    });

    it("ignores decorative/structural neurons during raycasting", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);

      const structural = sampleGraph.neurons.find((n) => !n.isPost)!;
      structural.x = 400;
      structural.y = 300;

      // Position all post neurons far away
      for (const p of sampleGraph.postNeurons) {
        p.x = 2000;
        p.y = 2000;
      }

      renderer.setGraph(sampleGraph);

      const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
      const hit = renderer.pickNeuron(400, 300, rect);

      expect(hit).toBeNull();

      renderer.dispose();
    });

    it("respects topic filter during raycasting, skipping dimmed post neurons", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);

      const targetPost = sampleGraph.postNeurons.find((p) => p.topicId === "rag")!;
      targetPost.x = 400;
      targetPost.y = 300;
      renderer.setGraph(sampleGraph);

      const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;

      // Filter to agents: should ignore rag post
      renderer.setFilterTopic("agents");
      expect(renderer.pickNeuron(400, 300, rect)).toBeNull();

      // Filter to rag: should hit rag post
      renderer.setFilterTopic("rag");
      expect(renderer.pickNeuron(400, 300, rect)?.id).toBe(targetPost.id);

      renderer.dispose();
    });
  });

  describe("Render Loop, Camera Dynamics & Reduced Motion", () => {
    it("updates camera tilt based on cursor coordinates under standard mode", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);

      const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
      // Move cursor to top right (positive X, negative Y in NDC)
      renderer.setCursor(700, 100, rect);

      // Render standard frame
      renderer.render(16, 1000, false);

      const camera = renderer.getCamera();
      expect(camera.rotation.x !== 0 || camera.rotation.y !== 0).toBe(true);

      renderer.dispose();
    });

    it("zeros camera drift, tilt and disables signals when isReducedMotion is true", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);
      renderer.setGraph(sampleGraph);

      const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
      renderer.setCursor(700, 100, rect);

      // Render with isReducedMotion: true
      renderer.render(16, 1000, true);

      const camera = renderer.getCamera();
      expect(camera.rotation.x).toBeCloseTo(0, 4);
      expect(camera.rotation.y).toBeCloseTo(0, 4);
      expect(camera.rotation.z).toBeCloseTo(0, 4);

      // Signals should be zero or inactive
      expect(renderer.getActiveSignalCount()).toBe(0);

      renderer.dispose();
    });

    it("advances 3D signals along connection paths during standard render loop", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.resize(800, 600, 1);
      renderer.setGraph(sampleGraph);

      // Trigger burst on post neuron
      renderer.setSelectedNeuron(sampleGraph.postNeurons[0]);
      expect(renderer.getActiveSignalCount()).toBeGreaterThan(0);

      const initialSignals = renderer.getActiveSignalCount();
      expect(initialSignals).toBeGreaterThan(0);
      renderer.render(32, 1032, false);

      // Signals are actively updated
      expect(renderer.getActiveSignalCount()).toBeGreaterThanOrEqual(0);

      renderer.dispose();
    });
  });

  describe("Disposal & Cleanup", () => {
    it("disposes geometries, materials, renderer context cleanly without leaks", () => {
      const renderer = new ThreeNetworkRenderer(canvas, graphConfig, mockThemeColors);
      renderer.setGraph(sampleGraph);

      const mockR = renderer.getRenderer() as unknown as MockWebGLRendererType;

      renderer.dispose();

      expect(mockR.dispose).toHaveBeenCalled();
      expect(mockR.forceContextLoss).toHaveBeenCalled();
      expect(renderer.getScene().children.length).toBe(0);
      expect(renderer.getNeuronMesh(sampleGraph.postNeurons[0].id)).toBeUndefined();
    });
  });
});
