import { describe, it, expect } from "vitest";
import { siteConfig } from "@config/index";
import { siteConfigSchema } from "@config/schemas/site";

describe("Learning Hub Configuration", () => {
  describe("Site Configuration UI Labels", () => {
    it("validates all learning navigation and UI labels exist in siteConfig.ui with sentence case", () => {
      expect(siteConfig.ui.navLearnLabel).toBe("Learn");
      expect(siteConfig.ui.learnHubTitle).toBe("Learning Hub");
      expect(siteConfig.ui.learnHubTagline).toBe(
        "Structured paths, deep-dive series, and production tips for modern AI systems engineering."
      );
      expect(siteConfig.ui.tabPathsLabel).toBe("Learning paths");
      expect(siteConfig.ui.tabSeriesLabel).toBe("Series roadmaps");
      expect(siteConfig.ui.tabTipsLabel).toBe("Tips & tricks");
      expect(siteConfig.ui.copySnippetLabel).toBe("Copy snippet");
      expect(siteConfig.ui.copiedSnippetLabel).toBe("Copied!");
      expect(siteConfig.ui.progressCompletedLabel).toBe("Completed");
      expect(siteConfig.ui.milestonesLabel).toBe("Milestones");
      expect(siteConfig.ui.filterAllLabel).toBe("All");
    });
  });

  describe("Schema Defaults and Validation", () => {
    const minimalValidSite = {
      name: "Epoch",
      tagline: "AI Engineering",
      description: "Engineering Blog",
      url: "https://epoch.dev",
      author: {
        name: "Engineer",
        bio: "Systems",
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

    it("applies expected defaults in siteConfigSchema when learning labels are omitted", () => {
      const parsed = siteConfigSchema.parse(minimalValidSite);

      expect(parsed.ui.navLearnLabel).toBe("Learn");
      expect(parsed.ui.learnHubTitle).toBe("Learning Hub");
      expect(parsed.ui.learnHubTagline).toBe(
        "Structured paths, deep-dive series, and production tips for modern AI systems engineering."
      );
      expect(parsed.ui.tabPathsLabel).toBe("Learning paths");
      expect(parsed.ui.tabSeriesLabel).toBe("Series roadmaps");
      expect(parsed.ui.tabTipsLabel).toBe("Tips & tricks");
      expect(parsed.ui.copySnippetLabel).toBe("Copy snippet");
      expect(parsed.ui.copiedSnippetLabel).toBe("Copied!");
      expect(parsed.ui.progressCompletedLabel).toBe("Completed");
      expect(parsed.ui.milestonesLabel).toBe("Milestones");
      expect(parsed.ui.filterAllLabel).toBe("All");
    });

    it("accepts custom overrides for learning UI labels", () => {
      const customSite = {
        ...minimalValidSite,
        ui: {
          ...minimalValidSite.ui,
          navLearnLabel: "Roadmaps",
          learnHubTitle: "Skill Hub",
          tabPathsLabel: "Guided paths",
          tabSeriesLabel: "Series tracks",
          tabTipsLabel: "Bite-sized tips",
          copySnippetLabel: "Copy code",
          copiedSnippetLabel: "Done!",
          progressCompletedLabel: "Finished",
          milestonesLabel: "Steps",
          filterAllLabel: "Everything",
        },
      };

      const parsed = siteConfigSchema.parse(customSite);
      expect(parsed.ui.navLearnLabel).toBe("Roadmaps");
      expect(parsed.ui.learnHubTitle).toBe("Skill Hub");
      expect(parsed.ui.tabPathsLabel).toBe("Guided paths");
      expect(parsed.ui.tabSeriesLabel).toBe("Series tracks");
      expect(parsed.ui.tabTipsLabel).toBe("Bite-sized tips");
      expect(parsed.ui.copySnippetLabel).toBe("Copy code");
      expect(parsed.ui.copiedSnippetLabel).toBe("Done!");
      expect(parsed.ui.progressCompletedLabel).toBe("Finished");
      expect(parsed.ui.milestonesLabel).toBe("Steps");
      expect(parsed.ui.filterAllLabel).toBe("Everything");
    });

    it("rejects non-string values for learning labels", () => {
      expect(() =>
        siteConfigSchema.parse({
          ...minimalValidSite,
          ui: {
            ...minimalValidSite.ui,
            navLearnLabel: 123,
          },
        })
      ).toThrow();

      expect(() =>
        siteConfigSchema.parse({
          ...minimalValidSite,
          ui: {
            ...minimalValidSite.ui,
            tabTipsLabel: false,
          },
        })
      ).toThrow();
    });
  });
});
