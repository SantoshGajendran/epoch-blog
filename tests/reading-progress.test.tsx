import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReadingProgress } from "@/components/post/reading-progress";
import { ShareButton } from "@/components/post/share-button";
import { siteConfig } from "@config/index";

describe("ReadingProgress & ShareButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("ReadingProgress", () => {
    it("renders progressbar with initial progress 0", () => {
      render(<ReadingProgress />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute("aria-valuenow", "0");
      expect(progressbar).toHaveAttribute("aria-valuemin", "0");
      expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    });

    it("updates progress value on window scroll event", () => {
      render(<ReadingProgress />);
      const progressbar = screen.getByRole("progressbar");

      // Mock scroll height
      Object.defineProperty(document.documentElement, "scrollHeight", { value: 2000, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });
      Object.defineProperty(window, "scrollY", { value: 500, configurable: true });

      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });

      // 500 / (2000 - 1000) = 50%
      expect(progressbar).toHaveAttribute("aria-valuenow", "50");
    });

    it("supports targetRef when provided", () => {
      const target = document.createElement("div");
      Object.defineProperty(target, "offsetTop", { value: 0, configurable: true });
      Object.defineProperty(target, "offsetHeight", { value: 2000, configurable: true });

      const ref = { current: target };
      render(<ReadingProgress targetRef={ref} />);
      const progressbar = screen.getByRole("progressbar");

      Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });
      Object.defineProperty(window, "scrollY", { value: 500, configurable: true });

      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });

      expect(progressbar).toHaveAttribute("aria-valuenow", "50");
    });
  });

  describe("ShareButton", () => {
    it("renders with configured share label and copies link on click", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<ShareButton title="Test Post" url="https://epoch.dev/posts/test" />);
      const button = screen.getByRole("button", { name: siteConfig.ui.sharePostLabel });
      expect(button).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(button);
      });

      expect(writeTextMock).toHaveBeenCalledWith("https://epoch.dev/posts/test");
      expect(screen.getByText(siteConfig.ui.linkCopiedLabel)).toBeInTheDocument();
    });

    it("uses navigator.share when available and supported", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      const canShareMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(navigator, "share", {
        value: shareMock,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, "canShare", {
        value: canShareMock,
        writable: true,
        configurable: true,
      });

      render(<ShareButton title="Test Post" text="Description" url="https://epoch.dev/posts/test" />);
      const button = screen.getByRole("button", { name: siteConfig.ui.sharePostLabel });

      await act(async () => {
        fireEvent.click(button);
      });

      expect(shareMock).toHaveBeenCalledWith({
        title: "Test Post",
        text: "Description",
        url: "https://epoch.dev/posts/test",
      });
    });

    it("falls back to clipboard if navigator.share fails or is rejected", async () => {
      const shareMock = vi.fn().mockRejectedValue(new Error("AbortError"));
      const canShareMock = vi.fn().mockReturnValue(true);
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, "share", {
        value: shareMock,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, "canShare", {
        value: canShareMock,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<ShareButton title="Test Post" url="https://epoch.dev/posts/test" />);
      const button = screen.getByRole("button", { name: siteConfig.ui.sharePostLabel });

      await act(async () => {
        fireEvent.click(button);
      });

      expect(shareMock).toHaveBeenCalled();
      expect(writeTextMock).toHaveBeenCalledWith("https://epoch.dev/posts/test");
      expect(screen.getByText(siteConfig.ui.linkCopiedLabel)).toBeInTheDocument();
    });
  });
});
