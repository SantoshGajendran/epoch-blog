import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("ReadingProgress", () => {
    it("renders progressbar with initial progress 0", () => {
      render(<ReadingProgress />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute("aria-label", "Reading progress");
      expect(progressbar).toHaveAttribute("aria-valuenow", "0");
      expect(progressbar).toHaveAttribute("aria-valuemin", "0");
      expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    });

    it("supports custom aria-label", () => {
      render(<ReadingProgress aria-label="Custom progress" />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-label", "Custom progress");
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

    it("updates progress value on window resize event", () => {
      render(<ReadingProgress />);
      const progressbar = screen.getByRole("progressbar");

      Object.defineProperty(document.documentElement, "scrollHeight", { value: 3000, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });
      Object.defineProperty(window, "scrollY", { value: 500, configurable: true });

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      // 500 / (3000 - 1000) = 25%
      expect(progressbar).toHaveAttribute("aria-valuenow", "25");
    });

    it("supports targetRef when provided using getBoundingClientRect", () => {
      const target = document.createElement("div");
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
        top: -500,
        bottom: 1500,
        left: 0,
        right: 1000,
        width: 1000,
        height: 2000,
        x: 0,
        y: -500,
        toJSON: () => {},
      });

      const ref = { current: target };
      render(<ReadingProgress targetRef={ref} />);
      const progressbar = screen.getByRole("progressbar");

      Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });
      Object.defineProperty(window, "scrollY", { value: 500, configurable: true });

      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });

      // elementTop = -500 + 500 = 0
      // totalScrollable = 2000 - 1000 = 1000
      // scrollDistance = 500 - 0 = 500 -> 50%
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

    it("clears timeout on unmount", async () => {
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const { unmount } = render(<ShareButton title="Test Post" url="https://epoch.dev/posts/test" />);
      const button = screen.getByRole("button", { name: siteConfig.ui.sharePostLabel });

      await act(async () => {
        fireEvent.click(button);
      });

      expect(screen.getByText(siteConfig.ui.linkCopiedLabel)).toBeInTheDocument();

      unmount();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("clears existing timeout when clicked repeatedly", async () => {
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
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
      await act(async () => {
        fireEvent.click(button);
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(writeTextMock).toHaveBeenCalledTimes(2);
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
