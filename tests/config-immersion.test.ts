import { describe, it, expect } from "vitest";
import { graphConfig, siteConfig } from "@config/index";
import { graphConfigSchema } from "@config/schemas/graph";
import { siteConfigSchema } from "@config/schemas/site";

describe("Immersion Configuration Extensions", () => {
  describe("Graph 3D Configuration", () => {
    it("exports valid 3D configuration in graphConfig", () => {
      expect(graphConfig).toHaveProperty("three");
      expect(graphConfig.three.cameraFov).toBe(45);
      expect(graphConfig.three.depthSpread).toBe(120);
      expect(graphConfig.three.tiltSensitivity).toBe(0.15);
      expect(graphConfig.three.ambientDriftSpeed).toBe(0.05);
    });

    it("validates 3D configuration schema requirements", () => {
      const validConfig = {
        ...graphConfig,
        three: {
          cameraFov: 50,
          depthSpread: 100,
          tiltSensitivity: 0.2,
          ambientDriftSpeed: 0.08,
        },
      };
      expect(() => graphConfigSchema.parse(validConfig)).not.toThrow();
    });

    it("fails loud when 3D configuration has invalid or negative values", () => {
      const invalidConfig = {
        ...graphConfig,
        three: {
          cameraFov: -10, // positive required
          depthSpread: 120,
          tiltSensitivity: 0.15,
          ambientDriftSpeed: 0.05,
        },
      };
      expect(() => graphConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe("Site UI Immersion Labels", () => {
    it("exports all immersion UI labels in siteConfig.ui", () => {
      expect(siteConfig.ui.viewMode2dLabel).toBe("2D");
      expect(siteConfig.ui.viewMode3dLabel).toBe("3D");
      expect(siteConfig.ui.soundToggleAriaLabel).toBe("Toggle sound feedback");
      expect(siteConfig.ui.soundEnabledLabel).toBe("Sound enabled");
      expect(siteConfig.ui.soundDisabledLabel).toBe("Sound muted");
      expect(siteConfig.ui.diagramPreviousStepLabel).toBe("Previous step");
      expect(siteConfig.ui.diagramNextStepLabel).toBe("Next step");
      expect(siteConfig.ui.diagramStepPrefix).toBe("Step");
      expect(siteConfig.ui.diagramOfPrefix).toBe("of");
      expect(siteConfig.ui.diagramHeaderLabel).toBe("Interactive diagram");
    });

    it("applies defaults in siteConfigSchema when immersion labels are omitted", () => {
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
      expect(parsed.ui.viewMode2dLabel).toBe("2D");
      expect(parsed.ui.viewMode3dLabel).toBe("3D");
      expect(parsed.ui.soundToggleAriaLabel).toBe("Toggle sound feedback");
      expect(parsed.ui.soundEnabledLabel).toBe("Sound enabled");
      expect(parsed.ui.soundDisabledLabel).toBe("Sound muted");
      expect(parsed.ui.diagramPreviousStepLabel).toBe("Previous step");
      expect(parsed.ui.diagramNextStepLabel).toBe("Next step");
      expect(parsed.ui.diagramStepPrefix).toBe("Step");
      expect(parsed.ui.diagramOfPrefix).toBe("of");
      expect(parsed.ui.diagramHeaderLabel).toBe("Interactive diagram");
    });
  });
});
