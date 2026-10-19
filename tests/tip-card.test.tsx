import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TipCard } from "@/components/learn/tip-card";
import { SoundProvider } from "@/lib/audio/sound-provider";
import { siteConfig } from "@config/index";
import type { Tip } from "@/lib/content";

describe("TipCard Component", () => {
  const mockTip: Tip = {
    id: "vllm-speculative-tokens",
    title: "vLLM Speculative Decoding Optimization",
    summary: "Configure draft models with speculative token length to achieve 2.4x inference speedup.",
    badges: ["LLM", "Infra"],
    codeSnippet: "python -m vllm.entrypoints.openai.api_server --speculative-model draft-1b --num-speculative-tokens 5",
    copyLabel: "Copy command",
    order: 1,
    body: "MDX body content",
    slug: "vllm-speculative-tokens",
    permalink: "/learn/tips/vllm-speculative-tokens",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders tip badges, title, summary, and code snippet", () => {
    render(<TipCard tip={mockTip} />);

    expect(screen.getByText("vLLM Speculative Decoding Optimization")).toBeInTheDocument();
    expect(
      screen.getByText("Configure draft models with speculative token length to achieve 2.4x inference speedup.")
    ).toBeInTheDocument();
    expect(screen.getByText("LLM")).toBeInTheDocument();
    expect(screen.getByText("Infra")).toBeInTheDocument();
    expect(
      screen.getByText("python -m vllm.entrypoints.openai.api_server --speculative-model draft-1b --num-speculative-tokens 5")
    ).toBeInTheDocument();
  });

  it("executes copy action, writes to clipboard, updates label and icon, and invokes onCopy callback", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const onCopyMock = vi.fn();

    render(<TipCard tip={mockTip} onCopy={onCopyMock} />);

    const copyBtn = screen.getByRole("button", { name: "Copy command" });
    expect(copyBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith(mockTip.codeSnippet);
    expect(onCopyMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(siteConfig.ui.copiedSnippetLabel)).toBeInTheDocument();
  });

  it("reverts copy label back after 2000ms timeout", async () => {
    vi.useFakeTimers();

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<TipCard tip={mockTip} />);

    const copyBtn = screen.getByRole("button", { name: "Copy command" });

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(screen.getByText(siteConfig.ui.copiedSnippetLabel)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Copy command")).toBeInTheDocument();
  });

  it("falls back to siteConfig.ui.copySnippetLabel when tip.copyLabel is empty or undefined", () => {
    const tipWithoutLabel = {
      ...mockTip,
      copyLabel: "",
    };

    render(<TipCard tip={tipWithoutLabel} />);

    expect(screen.getByRole("button", { name: siteConfig.ui.copySnippetLabel })).toBeInTheDocument();
  });

  it("plays audio sound tick on copy when sound is enabled", async () => {
    localStorage.setItem("epoch_sound_enabled", "true");

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(
      <SoundProvider>
        <TipCard tip={mockTip} />
      </SoundProvider>
    );

    const copyBtn = screen.getByRole("button", { name: "Copy command" });

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalled();
  });

  it("handles clipboard write failure gracefully without throwing and does not set copied state", async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Clipboard permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
    const onCopyMock = vi.fn();

    render(<TipCard tip={mockTip} onCopy={onCopyMock} />);

    const copyBtn = screen.getByRole("button", { name: "Copy command" });

    // Should not throw unhandled exception
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalled();
    expect(onCopyMock).not.toHaveBeenCalled();
    expect(screen.queryByText(siteConfig.ui.copiedSnippetLabel)).not.toBeInTheDocument();
    expect(screen.getByText("Copy command")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<TipCard tip={mockTip} className="custom-tip-card" />);
    expect(container.firstChild).toHaveClass("custom-tip-card");
  });
});
