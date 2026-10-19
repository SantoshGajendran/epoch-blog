import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BadgeFilterBar } from "@/components/learn/badge-filter-bar";
import { LearningStatsBar } from "@/components/learn/learning-stats-bar";
import { SoundProvider } from "@/lib/audio/sound-provider";
import { siteConfig } from "@config/index";

describe("BadgeFilterBar Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders all badges and 'All' button with accessible roles and aria labels", () => {
    render(
      <BadgeFilterBar
        availableBadges={["LLM", "RAG", "Setup"]}
        activeBadges={new Set()}
        onToggleBadge={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const group = screen.getByRole("group");
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute("aria-label");

    const allBtn = screen.getByRole("button", { name: new RegExp(siteConfig.ui.filterAllLabel, "i") });
    expect(allBtn).toBeInTheDocument();
    expect(allBtn).toHaveAttribute("aria-pressed", "true");

    expect(screen.getByRole("button", { name: /LLM/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /RAG/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Setup/i })).toBeInTheDocument();
  });

  it("reflects activeBadges set in aria-pressed states and highlights active badge", () => {
    render(
      <BadgeFilterBar
        availableBadges={["LLM", "RAG", "Setup"]}
        activeBadges={new Set(["RAG"])}
        onToggleBadge={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const allBtn = screen.getByRole("button", { name: new RegExp(siteConfig.ui.filterAllLabel, "i") });
    expect(allBtn).toHaveAttribute("aria-pressed", "false");

    const ragBtn = screen.getByRole("button", { name: /RAG/i });
    expect(ragBtn).toHaveAttribute("aria-pressed", "true");
    expect(ragBtn.className).toContain("bg-lime");

    const llmBtn = screen.getByRole("button", { name: /LLM/i });
    expect(llmBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onToggleBadge when a badge button is clicked", () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();

    render(
      <BadgeFilterBar
        availableBadges={["LLM", "RAG", "Setup"]}
        activeBadges={new Set()}
        onToggleBadge={onToggle}
        onClear={onClear}
      />
    );

    const ragBtn = screen.getByRole("button", { name: /RAG/i });
    fireEvent.click(ragBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("RAG");
    expect(onClear).not.toHaveBeenCalled();
  });

  it("calls onClear when 'All' button is clicked", () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();

    render(
      <BadgeFilterBar
        availableBadges={["LLM", "RAG", "Setup"]}
        activeBadges={new Set(["LLM"])}
        onToggleBadge={onToggle}
        onClear={onClear}
      />
    );

    const allBtn = screen.getByRole("button", { name: new RegExp(siteConfig.ui.filterAllLabel, "i") });
    fireEvent.click(allBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("renders item counts next to badge labels when provided", () => {
    render(
      <BadgeFilterBar
        availableBadges={["LLM", "RAG", "Setup"]}
        activeBadges={new Set(["LLM"])}
        onToggleBadge={vi.fn()}
        onClear={vi.fn()}
        itemCounts={{ LLM: 5, RAG: 2, Setup: 0 }}
      />
    );

    const llmBtn = screen.getByRole("button", { name: /LLM/i });
    expect(llmBtn).toHaveTextContent("5");

    const ragBtn = screen.getByRole("button", { name: /RAG/i });
    expect(ragBtn).toHaveTextContent("2");

    const setupBtn = screen.getByRole("button", { name: /Setup/i });
    expect(setupBtn).toHaveTextContent("0");
  });

  it("triggers audio sound tick on clicking badge or all button when sound is enabled", () => {
    localStorage.setItem("epoch_sound_enabled", "true");
    const onToggle = vi.fn();
    const onClear = vi.fn();

    render(
      <SoundProvider>
        <BadgeFilterBar
          availableBadges={["LLM", "RAG"]}
          activeBadges={new Set()}
          onToggleBadge={onToggle}
          onClear={onClear}
        />
      </SoundProvider>
    );

    const llmBtn = screen.getByRole("button", { name: /LLM/i });
    fireEvent.click(llmBtn);
    expect(onToggle).toHaveBeenCalledWith("LLM");

    const allBtn = screen.getByRole("button", { name: new RegExp(siteConfig.ui.filterAllLabel, "i") });
    fireEvent.click(allBtn);
    expect(onClear).toHaveBeenCalled();
  });
});

describe("LearningStatsBar Component", () => {
  it("renders cybernetic metrics with role='status' and configured labels", () => {
    render(
      <LearningStatsBar
        completedMilestones={3}
        totalMilestones={6}
        activeTracks={2}
        totalTips={10}
      />
    );

    const statusElem = screen.getByRole("status");
    expect(statusElem).toBeInTheDocument();

    expect(screen.getByText(new RegExp(siteConfig.ui.progressCompletedLabel, "i"))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(siteConfig.ui.milestonesLabel, "i"))).toBeInTheDocument();
    expect(screen.getByText("3/6")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();

    expect(screen.getByText(new RegExp(siteConfig.ui.tabPathsLabel, "i"))).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(screen.getByText(new RegExp(siteConfig.ui.tabTipsLabel, "i"))).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("handles 0 totalMilestones safely without NaN", () => {
    render(
      <LearningStatsBar
        completedMilestones={0}
        totalMilestones={0}
        activeTracks={0}
        totalTips={0}
      />
    );

    expect(screen.getByText("0/0")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders mini progress bar with correct width style corresponding to percentage", () => {
    render(
      <LearningStatsBar
        completedMilestones={1}
        totalMilestones={4}
        activeTracks={1}
        totalTips={5}
      />
    );

    const progressBar = screen.getByTestId("learning-progress-fill");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: "25%" });
  });

  it("applies custom className", () => {
    render(
      <LearningStatsBar
        completedMilestones={2}
        totalMilestones={4}
        activeTracks={1}
        totalTips={3}
        className="custom-stats-class"
      />
    );

    const statusElem = screen.getByRole("status");
    expect(statusElem.className).toContain("custom-stats-class");
  });
});
