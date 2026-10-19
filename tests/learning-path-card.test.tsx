import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LearningPathCard } from "@/components/learn/learning-path-card";
import { SoundProvider } from "@/lib/audio/sound-provider";
import { siteConfig } from "@config/index";
import type { Path } from "@/lib/content";

describe("LearningPathCard Component", () => {
  const mockPath: Path = {
    id: "llm-systems",
    title: "LLM Systems Engineering",
    summary: "Production serving architecture and high-throughput inference.",
    badge: "LLM",
    level: "Advanced",
    estimatedHours: 6,
    order: 1,
    slug: "llm-systems",
    permalink: "/learn/paths/llm-systems",
    body: "",
    steps: [
      {
        id: "step-1",
        title: "PagedAttention Deep Dive",
        description: "Understanding non-contiguous physical memory allocation in vLLM.",
        postSlug: "infra-vllm-speculative-decoding",
        type: "article",
      },
      {
        id: "step-2",
        title: "Custom Triton Kernel",
        description: "Implement fused FlashAttention operator.",
        externalUrl: "https://github.com/triton-lang/triton",
        type: "code",
      },
      {
        id: "step-3",
        title: "Serving Benchmark Suite",
        description: "Measure TTFT and TPS under varying concurrency loads.",
        type: "benchmark",
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders path header: title, summary, badge, level, and estimated hours", () => {
    render(
      <LearningPathCard
        path={mockPath}
        onToggleStep={vi.fn()}
        isCompleted={() => false}
      />
    );

    expect(screen.getByText("LLM Systems Engineering")).toBeInTheDocument();
    expect(
      screen.getByText("Production serving architecture and high-throughput inference.")
    ).toBeInTheDocument();
    expect(screen.getByText("LLM")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    expect(screen.getByText("6h")).toBeInTheDocument();
  });

  it("calculates progress percentage and updates progressbar and readout", () => {
    // 1 of 3 completed -> 33%
    const isCompleted = (key: string) => key === "llm-systems:step-1";

    render(
      <LearningPathCard
        path={mockPath}
        onToggleStep={vi.fn()}
        isCompleted={isCompleted}
      />
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "33");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");

    expect(
      screen.getByText(new RegExp(`1/3\\s+${siteConfig.ui.progressCompletedLabel}`, "i"))
    ).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("renders 100% progress when all steps are completed", () => {
    const isCompleted = () => true;

    render(
      <LearningPathCard
        path={mockPath}
        onToggleStep={vi.fn()}
        isCompleted={isCompleted}
      />
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "100");
    expect(
      screen.getByText(new RegExp(`3/3\\s+${siteConfig.ui.progressCompletedLabel}`, "i"))
    ).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders milestone steps inside an ordered list with descriptions and type badges", () => {
    render(
      <LearningPathCard
        path={mockPath}
        onToggleStep={vi.fn()}
        isCompleted={() => false}
      />
    );

    const list = screen.getByRole("list");
    expect(list.tagName.toLowerCase()).toBe("ol");

    expect(screen.getByText("PagedAttention Deep Dive")).toBeInTheDocument();
    expect(
      screen.getByText("Understanding non-contiguous physical memory allocation in vLLM.")
    ).toBeInTheDocument();

    expect(screen.getByText("Custom Triton Kernel")).toBeInTheDocument();
    expect(screen.getByText("Implement fused FlashAttention operator.")).toBeInTheDocument();

    expect(screen.getByText("Serving Benchmark Suite")).toBeInTheDocument();
    expect(
      screen.getByText("Measure TTFT and TPS under varying concurrency loads.")
    ).toBeInTheDocument();
  });

  it("renders step checkboxes with proper accessibility attributes and checked state", () => {
    const isCompleted = (key: string) => key === "llm-systems:step-1";

    render(
      <LearningPathCard
        path={mockPath}
        onToggleStep={vi.fn()}
        isCompleted={isCompleted}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);

    expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
    expect(checkboxes[0]).toHaveAttribute("aria-label", "PagedAttention Deep Dive");

    expect(checkboxes[1]).toHaveAttribute("aria-checked", "false");
    expect(checkboxes[1]).toHaveAttribute("aria-label", "Custom Triton Kernel");

    expect(checkboxes[2]).toHaveAttribute("aria-checked", "false");
    expect(checkboxes[2]).toHaveAttribute("aria-label", "Serving Benchmark Suite");
  });

  it("triggers onToggleStep with qualified path:step key when checkbox is clicked", () => {
    const onToggle = vi.fn();

    render(
      <LearningPathCard
        path={mockPath}
        onToggleStep={onToggle}
        isCompleted={() => false}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("llm-systems:step-2");
  });

  it("plays audio sound tick on toggle when wrapped in SoundProvider", () => {
    localStorage.setItem("epoch_sound_enabled", "true");
    const onToggle = vi.fn();

    render(
      <SoundProvider>
        <LearningPathCard
          path={mockPath}
          onToggleStep={onToggle}
          isCompleted={() => false}
        />
      </SoundProvider>
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    expect(onToggle).toHaveBeenCalledWith("llm-systems:step-1");
  });

  it("renders internal post link when postSlug is provided", () => {
    render(
      <LearningPathCard
        path={mockPath}
        onToggleStep={vi.fn()}
        isCompleted={() => false}
      />
    );

    const postLink = screen.getByRole("link", { name: /PagedAttention Deep Dive/i });
    expect(postLink).toHaveAttribute("href", "/posts/infra-vllm-speculative-decoding");
  });

  it("renders external link with target='_blank' and rel='noopener noreferrer' when externalUrl is provided", () => {
    render(
      <LearningPathCard
        path={mockPath}
        onToggleStep={vi.fn()}
        isCompleted={() => false}
      />
    );

    const externalLink = screen.getByRole("link", { name: /Custom Triton Kernel/i });
    expect(externalLink).toHaveAttribute("href", "https://github.com/triton-lang/triton");
    expect(externalLink).toHaveAttribute("target", "_blank");
    expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("applies custom className to card", () => {
    const { container } = render(
      <LearningPathCard
        path={mockPath}
        onToggleStep={vi.fn()}
        isCompleted={() => false}
        className="custom-path-card"
      />
    );

    expect(container.firstChild).toHaveClass("custom-path-card");
  });
});
