import { describe, it, expect } from "vitest";
import { topicsConfig, graphConfig } from "@config/index";
import { buildNetworkGraph } from "@/lib/network/builder";
import {
  computeClusterWidth,
  computeRowHeight,
  computeTargetPosition,
  updatePhysics,
  initNeuronPositions,
} from "@/lib/network/physics";
import { SignalSystem, getSignalTrail } from "@/lib/network/signals";
import type { Neuron, ViewportDimensions, MouseState } from "@/lib/network/types";

const dimensions: ViewportDimensions = { width: 1000, height: 600 };

describe("Network Physics Engine", () => {
  const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, []);

  describe("Geometry Calculator", () => {
    it("computes cluster width and row height clamped by bounds", () => {
      // cw = min(W * 0.34, 300)
      expect(computeClusterWidth(1000)).toBe(300); // 1000 * 0.34 = 340 -> clamped to 300
      expect(computeClusterWidth(500)).toBe(170); // 500 * 0.34 = 170

      // sy = min(H * 0.1, 58)
      expect(computeRowHeight(600)).toBe(58); // 600 * 0.1 = 60 -> clamped to 58
      expect(computeRowHeight(400)).toBe(40); // 400 * 0.1 = 40
    });

    it("calculates static target positions without drift when isReducedMotion is true", () => {
      const agentsCluster = graph.clustersByTopic.get("agents")!;
      const neuron = agentsCluster.layers[0][0]; // layer 0, row 0, rowCount = 2
      const hub = agentsCluster.hub;

      const cw = computeClusterWidth(dimensions.width); // 300
      const sy = computeRowHeight(dimensions.height); // 58

      const expectedX = hub.x * dimensions.width + (0 - 1.5) * (cw / 3);
      const expectedY = hub.y * dimensions.height + (0 - (2 - 1) / 2) * sy;

      const pos = computeTargetPosition(neuron, hub, dimensions, 1000, true);

      expect(pos.x).toBeCloseTo(expectedX, 5);
      expect(pos.y).toBeCloseTo(expectedY, 5);
    });

    it("applies harmonic ambient drift when isReducedMotion is false", () => {
      const agentsCluster = graph.clustersByTopic.get("agents")!;
      const neuron = agentsCluster.layers[1][1]; // layer 1, row 1, rowCount = 3
      const hub = agentsCluster.hub;

      const now1 = 1000;
      const now2 = 2500;

      const posStatic = computeTargetPosition(neuron, hub, dimensions, now1, true);
      const pos1 = computeTargetPosition(neuron, hub, dimensions, now1, false);
      const pos2 = computeTargetPosition(neuron, hub, dimensions, now2, false);

      // In motion mode, position includes drift (within 3px amplitude)
      expect(pos1.x).not.toBe(posStatic.x);
      expect(pos1.y).not.toBe(posStatic.y);
      expect(Math.abs(pos1.x - posStatic.x)).toBeLessThanOrEqual(3.001);
      expect(Math.abs(pos1.y - posStatic.y)).toBeLessThanOrEqual(3.001);

      // Drift changes over time
      expect(pos1.x).not.toBe(pos2.x);
      expect(pos1.y).not.toBe(pos2.y);
    });
  });

  describe("updatePhysics simulation", () => {
    it("applies spring force, damping, and integrates velocity", () => {
      const testGraph = buildNetworkGraph(topicsConfig.topics, graphConfig, []);
      const neuron = testGraph.neurons[0];
      const hub = testGraph.clusters[neuron.clusterIndex].hub;

      // Position neuron away from target
      const target = computeTargetPosition(neuron, hub, dimensions, 0, true);
      neuron.x = target.x + 50;
      neuron.y = target.y + 50;
      neuron.vx = 0;
      neuron.vy = 0;

      const mouse: MouseState = { x: -1000, y: -1000 };
      const dt = 16;
      updatePhysics(testGraph, mouse, dimensions, graphConfig, dt, 0, false);

      // Spring pulls towards target (target.x - neuron.x is -50):
      // vx = -50 * 0.04 * 0.78 = -1.56
      expect(neuron.vx).toBeLessThan(0);
      expect(neuron.vy).toBeLessThan(0);
      expect(neuron.x).toBeLessThan(target.x + 50);
      expect(neuron.y).toBeLessThan(target.y + 50);
    });

    it("applies cursor repulsion force when pointer is within radius", () => {
      const testGraph = buildNetworkGraph(topicsConfig.topics, graphConfig, []);
      const neuron = testGraph.neurons[0];
      const hub = testGraph.clusters[neuron.clusterIndex].hub;
      const target = computeTargetPosition(neuron, hub, dimensions, 0, true);

      neuron.x = target.x;
      neuron.y = target.y;
      neuron.vx = 0;
      neuron.vy = 0;

      // Place mouse 30px to the left of the neuron (within 90px radius)
      const mouse: MouseState = { x: neuron.x - 30, y: neuron.y };
      const dt = 16;
      updatePhysics(testGraph, mouse, dimensions, graphConfig, dt, 0, false);

      // Repulsion should push neuron to the right (positive vx)
      expect(neuron.vx).toBeGreaterThan(0);
      expect(neuron.x).toBeGreaterThan(target.x);
    });

    it("does not apply cursor repulsion when pointer is beyond radius", () => {
      const testGraph = buildNetworkGraph(topicsConfig.topics, graphConfig, []);
      const neuron = testGraph.neurons[0];
      const hub = testGraph.clusters[neuron.clusterIndex].hub;
      const target = computeTargetPosition(neuron, hub, dimensions, 0, true);

      neuron.x = target.x;
      neuron.y = target.y;
      neuron.vx = 0;
      neuron.vy = 0;

      // Place mouse 200px away (well beyond 90px repulsion radius)
      const mouse: MouseState = { x: neuron.x + 200, y: neuron.y };
      const dt = 16;
      updatePhysics(testGraph, mouse, dimensions, graphConfig, dt, 0, false);

      // Spring displacement was 0, and cursor repulsion is 0, so vx should be ~0 (only slight drift)
      // Since drift at target is minimal, vx magnitude should be negligible compared to close repulsion
      expect(Math.abs(neuron.vx)).toBeLessThan(0.2);
    });

    it("directly snaps positions, zeroes velocity and flash under isReducedMotion", () => {
      const testGraph = buildNetworkGraph(topicsConfig.topics, graphConfig, []);
      const neuron = testGraph.neurons[0];
      const hub = testGraph.clusters[neuron.clusterIndex].hub;
      const staticTarget = computeTargetPosition(neuron, hub, dimensions, 500, true);

      neuron.x = 999;
      neuron.y = 888;
      neuron.vx = 10;
      neuron.vy = -15;
      neuron.f = 0.9;

      const mouse: MouseState = { x: neuron.x, y: neuron.y };
      updatePhysics(testGraph, mouse, dimensions, graphConfig, 16, 500, true);

      expect(neuron.x).toBeCloseTo(staticTarget.x, 5);
      expect(neuron.y).toBeCloseTo(staticTarget.y, 5);
      expect(neuron.vx).toBe(0);
      expect(neuron.vy).toBe(0);
      expect(neuron.f).toBe(0);
    });

    it("decays neuron flash intensity smoothly over time", () => {
      const testGraph = buildNetworkGraph(topicsConfig.topics, graphConfig, []);
      const neuron = testGraph.neurons[0];
      neuron.f = 1.0;

      const mouse: MouseState = { x: -1000, y: -1000 };
      const dt = 100; // decays by 100 * 0.002 = 0.2
      updatePhysics(testGraph, mouse, dimensions, graphConfig, dt, 0, false);

      expect(neuron.f).toBeCloseTo(0.8, 4);

      // Decay until clamped at 0
      updatePhysics(testGraph, mouse, dimensions, graphConfig, 500, 0, false);
      expect(neuron.f).toBe(0);
    });

    it("initializes neuron positions correctly via initNeuronPositions", () => {
      const testGraph = buildNetworkGraph(topicsConfig.topics, graphConfig, []);

      // In reduced motion, initializes directly to target
      initNeuronPositions(testGraph, dimensions, true);
      const n0 = testGraph.neurons[0];
      const hub = testGraph.clusters[n0.clusterIndex].hub;
      const expectedTarget = computeTargetPosition(n0, hub, dimensions, 0, true);
      expect(n0.x).toBeCloseTo(expectedTarget.x, 5);
      expect(n0.y).toBeCloseTo(expectedTarget.y, 5);
      expect(n0.vx).toBe(0);
      expect(n0.vy).toBe(0);

      // In standard motion, centers neurons at canvas center for intro explosion
      initNeuronPositions(testGraph, dimensions, false);
      expect(n0.x).toBe(dimensions.width / 2);
      expect(n0.y).toBe(dimensions.height / 2);
    });
  });
});

describe("Signal Propagation System", () => {
  const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, []);

  it("spawns ambient signals from input layer respecting concurrency limit", () => {
    const system = new SignalSystem(graphConfig);
    expect(system.signals.length).toBe(0);

    const signal = system.spawnAmbientSignal(graph);
    expect(signal).toBeDefined();
    expect(signal?.source.layer).toBe(0);
    expect(signal?.progress).toBe(0);
    expect(signal?.depth).toBe(0);
    expect(signal?.stop).toBe(false);
    expect(system.signals.length).toBe(1);

    // Speed within configured range
    const [minSpeed, maxSpeed] = graphConfig.signals.speedRange;
    expect(signal!.speed).toBeGreaterThanOrEqual(minSpeed);
    expect(signal!.speed).toBeLessThanOrEqual(maxSpeed);
  });

  it("steps signal progress and flashes target neuron upon arrival", () => {
    const system = new SignalSystem(graphConfig);
    const signal = system.spawnAmbientSignal(graph)!;
    const targetNeuron = signal.target;
    targetNeuron.f = 0;

    // Advance halfway (progress < 1)
    system.updateSignals(16, graph, false);
    expect(signal.progress).toBeGreaterThan(0);
    expect(signal.progress).toBeLessThan(1);
    expect(targetNeuron.f).toBe(0);

    // Force progress to complete
    signal.progress = 0.99;
    signal.speed = 0.1;
    system.updateSignals(16, graph, false);

    // Target neuron flashed
    expect(targetNeuron.f).toBe(1);
    // The original signal completed and was removed
    expect(system.signals.some((s) => s.id === signal.id)).toBe(false);
  });

  it("cascades to outgoing connections when signal reaches destination", () => {
    const system = new SignalSystem(graphConfig);

    // Create a signal destined for a neuron with outgoing connections
    const source = graph.neurons.find((n) => n.layer === 0 && n.out.length > 0)!;
    const target = source.out[0].target;
    expect(target.out.length).toBeGreaterThan(0);

    const initialSignal = {
      id: "test-cascade-signal",
      source,
      target,
      progress: 0.99,
      speed: 0.1,
      depth: 1,
      stop: false,
    };
    system.signals = [initialSignal];

    // Step should complete initial signal and spawn cascaded signal
    system.updateSignals(16, graph, false);

    expect(target.f).toBe(1);
    expect(system.signals.length).toBe(1);
    const cascaded = system.signals[0];
    expect(cascaded.id).not.toBe("test-cascade-signal");
    expect(cascaded.source.id).toBe(target.id);
    expect(cascaded.depth).toBe(2);
    expect(cascaded.progress).toBe(0);
  });

  it("does not cascade if signal has stop: true or reached maxDepth", () => {
    const system = new SignalSystem(graphConfig);
    const source = graph.neurons.find((n) => n.layer === 0 && n.out.length > 0)!;
    const target = source.out[0].target;

    // Test stop: true
    system.signals = [
      {
        id: "stop-signal",
        source,
        target,
        progress: 0.99,
        speed: 0.1,
        depth: 0,
        stop: true,
      },
    ];
    system.updateSignals(16, graph, false);
    expect(system.signals.length).toBe(0);

    // Test maxDepth reached
    system.signals = [
      {
        id: "max-depth-signal",
        source,
        target,
        progress: 0.99,
        speed: 0.1,
        depth: graphConfig.signals.maxDepth,
        stop: false,
      },
    ];
    system.updateSignals(16, graph, false);
    expect(system.signals.length).toBe(0);
  });

  it("strictly enforces maxConcurrent signal limit", () => {
    const customConfig = {
      ...graphConfig,
      signals: {
        ...graphConfig.signals,
        maxConcurrent: 3,
      },
    };
    const system = new SignalSystem(customConfig);

    // Spawn up to maxConcurrent
    expect(system.spawnAmbientSignal(graph)).not.toBeNull();
    expect(system.spawnAmbientSignal(graph)).not.toBeNull();
    expect(system.spawnAmbientSignal(graph)).not.toBeNull();
    expect(system.signals.length).toBe(3);

    // 4th spawn rejected
    const excess = system.spawnAmbientSignal(graph);
    expect(excess).toBeNull();
    expect(system.signals.length).toBe(3);

    // Cascade should also not exceed maxConcurrent
    const source = graph.neurons.find((n) => n.layer === 0 && n.out.length > 0)!;
    const target = source.out[0].target;
    system.signals[0] = {
      id: "full-cap-signal",
      source,
      target,
      progress: 0.99,
      speed: 0.1,
      depth: 0,
      stop: false,
    };
    system.updateSignals(16, graph, false);
    expect(system.signals.length).toBeLessThanOrEqual(3);
  });

  it("fireBurst launches signals along all incoming and outgoing connections", () => {
    const system = new SignalSystem(graphConfig);

    // Pick a hidden layer neuron with both incoming and outgoing links
    const neuron = graph.neurons.find((n) => n.layer === 1 && n.ins.length > 0 && n.out.length > 0)!;
    const inCount = neuron.ins.length;
    const outCount = neuron.out.length;
    const totalExpected = inCount + outCount;

    const burst = system.fireBurst(neuron);

    expect(burst.length).toBe(totalExpected);
    expect(system.signals.length).toBe(totalExpected);
    expect(neuron.f).toBe(1);

    // Verify incoming signals
    const inSignals = burst.filter((s) => s.target === neuron);
    expect(inSignals.length).toBe(inCount);
    inSignals.forEach((s) => {
      expect(s.stop).toBe(true);
      expect(s.isBackprop).toBe(true);
      expect(neuron.ins.some((c) => c.source === s.source)).toBe(true);
    });

    // Verify outgoing signals
    const outSignals = burst.filter((s) => s.source === neuron);
    expect(outSignals.length).toBe(outCount);
    outSignals.forEach((s) => {
      expect(s.stop).toBe(true);
      expect(neuron.out.some((c) => c.target === s.target)).toBe(true);
    });
  });

  it("clears active signals and halts updates when isReducedMotion is true", () => {
    const system = new SignalSystem(graphConfig);
    system.spawnAmbientSignal(graph);
    expect(system.signals.length).toBe(1);

    // Update with reduced motion active
    system.updateSignals(16, graph, true);
    expect(system.signals.length).toBe(0);

    // Ambient spawn returns null under reduced motion
    const ambient = system.spawnAmbientSignal(graph, true);
    expect(ambient).toBeNull();
  });

  it("generates multi-stage interpolated signal trail points", () => {
    const n1: Neuron = {
      id: "n1",
      topicId: "t",
      clusterIndex: 0,
      layer: 0,
      row: 0,
      rowCount: 1,
      isPost: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      f: 0,
      born: 0,
      out: [],
      ins: [],
    };
    const n2: Neuron = {
      id: "n2",
      topicId: "t",
      clusterIndex: 0,
      layer: 1,
      row: 0,
      rowCount: 1,
      isPost: false,
      x: 100,
      y: 0,
      vx: 0,
      vy: 0,
      f: 0,
      born: 0,
      out: [],
      ins: [],
    };

    const signal = {
      id: "s1",
      source: n1,
      target: n2,
      progress: 0.5,
      speed: 0.025,
      depth: 0,
    };

    const trail = getSignalTrail(signal, 4, 0.04);
    expect(trail.length).toBe(4);

    // Head of trail
    expect(trail[0].progress).toBe(0.5);
    expect(trail[0].x).toBe(50);
    expect(trail[0].alpha).toBe(1);

    // Trail points trail behind head with decreasing progress and alpha
    expect(trail[1].progress).toBeCloseTo(0.46, 5);
    expect(trail[1].x).toBeCloseTo(46, 5);
    expect(trail[1].alpha).toBeLessThan(trail[0].alpha);
    expect(trail[1].radius).toBeLessThan(trail[0].radius);
  });
});
