import { describe, it, expect } from "vitest";
import { siteConfig, navConfig, topicsConfig, graphConfig } from "@config/index";
import { siteConfigSchema } from "@config/schemas/site";
import { topicsConfigSchema } from "@config/schemas/topics";

describe("Configuration System", () => {
  it("exports valid site config matching schema", () => {
    expect(siteConfig.name).toBe("Epoch");
    expect(siteConfig.tagline).toBe("One more pass at understanding AI.");
    expect(() => siteConfigSchema.parse(siteConfig)).not.toThrow();
  });

  it("exports valid nav config", () => {
    expect(Array.isArray(navConfig.mainNav)).toBe(true);
  });

  it("exports valid topics config with all required topics", () => {
    expect(topicsConfig.topics.length).toBeGreaterThanOrEqual(4);
    const topicIds = topicsConfig.topics.map((t) => t.id);
    expect(topicIds).toContain("agents");
    expect(topicIds).toContain("rag");
    expect(topicIds).toContain("tune");
    expect(topicIds).toContain("infra");
  });

  it("fails loud when topic configuration has missing or invalid fields", () => {
    const invalidTopics = {
      topics: [
        {
          id: "invalid",
          label: "Invalid",
          // missing colorToken and clusterPosition
        },
      ],
    };
    expect(() => topicsConfigSchema.parse(invalidTopics)).toThrow();
  });

  it("exports valid graph config with layers and physics", () => {
    expect(graphConfig.physics.damping).toBeGreaterThan(0);
    expect(graphConfig.signals.maxConcurrent).toBeGreaterThan(0);
    expect(graphConfig.clusterLayers).toEqual([2, 3, 0, 2]); // 0 represents dynamic posts layer
    expect(graphConfig.postsLayerIndex).toBe(2);
  });
});
