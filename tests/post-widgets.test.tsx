import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { KeyTakeaways } from "@/components/post/key-takeaways";
import { SeriesNav } from "@/components/post/series-nav";
import { siteConfig } from "@config/index";

describe("KeyTakeaways & SeriesNav Widgets", () => {
  describe("KeyTakeaways", () => {
    it("renders key takeaways title and summary", () => {
      render(
        <KeyTakeaways
          summary="Core summary of findings."
          points={["Point 1: Trajectory divergence", "Point 2: Bounded loops"]}
        />
      );

      expect(screen.getByText(siteConfig.ui.keyTakeawaysTitle)).toBeInTheDocument();
      expect(screen.getByText("Core summary of findings.")).toBeInTheDocument();
      expect(screen.getByText("Point 1: Trajectory divergence")).toBeInTheDocument();
      expect(screen.getByText("Point 2: Bounded loops")).toBeInTheDocument();
    });

    it("renders without points gracefully", () => {
      const { container } = render(
        <KeyTakeaways summary="Summary without bullet points." />
      );

      expect(screen.getByText(siteConfig.ui.keyTakeawaysTitle)).toBeInTheDocument();
      expect(screen.getByText("Summary without bullet points.")).toBeInTheDocument();
      expect(container.querySelector("ul")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <KeyTakeaways
          summary="Summary with custom class."
          className="custom-takeaways-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-takeaways-class");
    });
  });

  describe("SeriesNav", () => {
    it("renders series title, part indicator, and next link for first series post", () => {
      render(
        <SeriesNav
          seriesId="agentic-architectures"
          currentSlug="agents-autonomous-evals"
        />
      );

      expect(screen.getByText("Agentic Architectures")).toBeInTheDocument();
      // First post in 2-post series
      expect(
        screen.getByText(
          new RegExp(`${siteConfig.ui.seriesPartPrefix} 1 ${siteConfig.ui.seriesOfPrefix}`, "i")
        )
      ).toBeInTheDocument();
      expect(screen.getByText(siteConfig.ui.nextPostLabel)).toBeInTheDocument();
      expect(screen.getByText("Hierarchical Supervisor Routing Patterns")).toBeInTheDocument();
      expect(screen.queryByText(siteConfig.ui.previousPostLabel)).not.toBeInTheDocument();
    });

    it("renders previous link for subsequent post in series", () => {
      render(
        <SeriesNav
          seriesId="agentic-architectures"
          currentSlug="agents-hierarchical-routing"
        />
      );

      expect(screen.getByText("Agentic Architectures")).toBeInTheDocument();
      expect(
        screen.getByText(
          new RegExp(`${siteConfig.ui.seriesPartPrefix} 2 ${siteConfig.ui.seriesOfPrefix}`, "i")
        )
      ).toBeInTheDocument();
      expect(screen.getByText(siteConfig.ui.previousPostLabel)).toBeInTheDocument();
      expect(screen.getByText("Evaluating Autonomous Agent Tool Loops")).toBeInTheDocument();
      expect(screen.queryByText(siteConfig.ui.nextPostLabel)).not.toBeInTheDocument();
    });

    it("returns null if seriesId is not found", () => {
      const { container } = render(
        <SeriesNav seriesId="non-existent-series" currentSlug="any-slug" />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("returns null if currentSlug is not found in the series", () => {
      const { container } = render(
        <SeriesNav seriesId="agentic-architectures" currentSlug="unknown-slug" />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("applies custom className", () => {
      render(
        <SeriesNav
          seriesId="agentic-architectures"
          currentSlug="agents-autonomous-evals"
          className="custom-series-nav"
        />
      );

      expect(screen.getByRole("complementary")).toHaveClass("custom-series-nav");
    });
  });
});
