import { describe, it, expect } from "vitest";
import { siteConfig, graphConfig } from "@config/index";
import { graphConfigSchema } from "@config/schemas/graph";
import { siteConfigSchema } from "@config/schemas/site";

describe("Cybernetic Configuration Extensions", () => {
  describe("3D Orbit and Zoom Configuration", () => {
    it("validates 3D orbit and zoom configuration settings in graphConfig", () => {
      expect(graphConfig.three.orbitDamping).toBe(0.05);
      expect(graphConfig.three.minDistanceRatio).toBe(0.4);
      expect(graphConfig.three.maxDistanceRatio).toBe(2.2);

      expect(graphConfig.three.orbitDamping).toBeGreaterThan(0);
      expect(graphConfig.three.minDistanceRatio).toBeLessThan(1);
      expect(graphConfig.three.maxDistanceRatio).toBeGreaterThan(1);
    });

    it("applies defaults in graphConfigSchema when orbit and zoom fields are omitted", () => {
      const parsed = graphConfigSchema.parse({
        clusterLayers: [2, 3, 0, 2],
        postsLayerIndex: 2,
        interTopicLinks: [],
        signals: {
          spawnIntervalMs: 16,
          spawnProbability: 0.06,
          speedRange: [0.02, 0.032],
          trailLength: 4,
          maxDepth: 9,
          maxConcurrent: 40,
          fireBurstIntervalMs: 2600,
        },
        physics: {
          spring: 0.04,
          damping: 0.78,
          cursorRepulsionRadius: 90,
          cursorRepulsionForce: 0.01,
        },
        animation: {
          introDurationMs: 600,
          clusterStaggerMs: 160,
          layerStaggerMs: 240,
          rowStaggerMs: 70,
        },
        three: {
          cameraFov: 45,
          depthSpread: 120,
          tiltSensitivity: 0.15,
          ambientDriftSpeed: 0.05,
        },
      });

      expect(parsed.three.orbitDamping).toBe(0.05);
      expect(parsed.three.minDistanceRatio).toBe(0.4);
      expect(parsed.three.maxDistanceRatio).toBe(2.2);
    });

    it("rejects non-positive numbers for orbitDamping, minDistanceRatio, and maxDistanceRatio", () => {
      const baseValid = {
        clusterLayers: [2, 3, 0, 2],
        postsLayerIndex: 2,
        interTopicLinks: [],
        signals: {
          spawnIntervalMs: 16,
          spawnProbability: 0.06,
          speedRange: [0.02, 0.032] as [number, number],
          trailLength: 4,
          maxDepth: 9,
          maxConcurrent: 40,
          fireBurstIntervalMs: 2600,
        },
        physics: {
          spring: 0.04,
          damping: 0.78,
          cursorRepulsionRadius: 90,
          cursorRepulsionForce: 0.01,
        },
        animation: {
          introDurationMs: 600,
          clusterStaggerMs: 160,
          layerStaggerMs: 240,
          rowStaggerMs: 70,
        },
        three: {
          cameraFov: 45,
          depthSpread: 120,
          tiltSensitivity: 0.15,
          ambientDriftSpeed: 0.05,
        },
      };

      expect(() =>
        graphConfigSchema.parse({
          ...baseValid,
          three: { ...baseValid.three, orbitDamping: -0.05 },
        })
      ).toThrow();

      expect(() =>
        graphConfigSchema.parse({
          ...baseValid,
          three: { ...baseValid.three, minDistanceRatio: 0 },
        })
      ).toThrow();

      expect(() =>
        graphConfigSchema.parse({
          ...baseValid,
          three: { ...baseValid.three, maxDistanceRatio: -1 },
        })
      ).toThrow();
    });
  });

  describe("Telemetry and Visualizer UI Labels", () => {
    it("validates telemetry and visualizer UI labels in sentence case in siteConfig.ui", () => {
      expect(siteConfig.ui.resetCameraLabel).toBe("Reset camera");
      expect(siteConfig.ui.telemetryClusterOnlineLabel).toBe("Cluster: online");
      expect(siteConfig.ui.telemetryNodesLabel).toBe("Nodes");
      expect(siteConfig.ui.telemetryPostsLabel).toBe("Posts");
      expect(siteConfig.ui.telemetrySignalsLabel).toBe("Signals");
      expect(siteConfig.ui.telemetryInferenceLabel).toBe("Inference");
      expect(siteConfig.ui.telemetrySynthActiveLabel).toBe("Synth: active");
      expect(siteConfig.ui.telemetrySynthMutedLabel).toBe("Muted");
      expect(siteConfig.ui.audioVisualizerAriaLabel).toBe("Audio frequency visualizer");
    });

    it("applies defaults in siteConfigSchema when cybernetic labels are omitted", () => {
      const minimalSite = {
        name: "Test",
        tagline: "Test tagline",
        description: "Test description",
        url: "https://example.com",
        author: {
          name: "Tester",
          bio: "Testing",
        },
        ui: {
          searchPlaceholder: "Search",
          searchButtonLabel: "Search",
          searchAriaLabel: "Search",
          themeToggleAriaLabel: "Theme",
          allTopicsLabel: "All",
          mapViewLabel: "Map",
          listViewLabel: "List",
          prototypeHint: "Hint",
          readPostLabel: "Read",
          minReadSuffix: "min",
          noSearchResultsLabel: "None",
        },
      };

      const parsed = siteConfigSchema.parse(minimalSite);
      expect(parsed.ui.resetCameraLabel).toBe("Reset camera");
      expect(parsed.ui.telemetryClusterOnlineLabel).toBe("Cluster: online");
      expect(parsed.ui.telemetryNodesLabel).toBe("Nodes");
      expect(parsed.ui.telemetryPostsLabel).toBe("Posts");
      expect(parsed.ui.telemetrySignalsLabel).toBe("Signals");
      expect(parsed.ui.telemetryInferenceLabel).toBe("Inference");
      expect(parsed.ui.telemetrySynthActiveLabel).toBe("Synth: active");
      expect(parsed.ui.telemetrySynthMutedLabel).toBe("Muted");
      expect(parsed.ui.audioVisualizerAriaLabel).toBe("Audio frequency visualizer");
    });
  });
});
