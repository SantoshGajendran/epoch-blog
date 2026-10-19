import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CyberBackground } from "@/components/ambient/cyber-background";

describe("CyberBackground Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    if (typeof window !== "undefined" && !window.PointerEvent) {
      window.PointerEvent = window.MouseEvent as unknown as typeof PointerEvent;
    }

    vi.stubGlobal("requestAnimationFrame", (cb: (time: number) => void) => {
      return setTimeout(() => cb(Date.now()), 16) as unknown as number;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });
    window.requestAnimationFrame = globalThis.requestAnimationFrame;
    window.cancelAnimationFrame = globalThis.cancelAnimationFrame;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders fixed background container with aria-hidden true and pointer-events-none", () => {
    const { container } = render(<CyberBackground />);
    const root = container.firstChild as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-0");
    expect(root.className).toContain("pointer-events-none");
    expect(root.className).toContain("-z-10");
    expect(root.className).toContain("overflow-hidden");
    expect(root.className).toContain("select-none");
  });

  it("renders SVG dot-matrix grid with cyber-grid pattern and radial mask", () => {
    const { container } = render(<CyberBackground />);
    const pattern = container.querySelector("#cyber-grid");
    expect(pattern).toBeInTheDocument();
    expect(pattern?.getAttribute("width")).toBe("28");
    expect(pattern?.getAttribute("height")).toBe("28");
    expect(pattern?.getAttribute("patternUnits")).toBe("userSpaceOnUse");

    const circle = pattern?.querySelector("circle");
    expect(circle).toBeInTheDocument();
    expect(circle?.getAttribute("cx")).toBe("1.5");
    expect(circle?.getAttribute("cy")).toBe("1.5");
    expect(circle?.getAttribute("r")).toBe("1");
    expect(circle?.getAttribute("fill")).toBe("currentColor");

    const svg = pattern?.closest("svg");
    expect(svg).toBeInTheDocument();
    const svgClasses = svg?.className.baseVal || svg?.getAttribute("class") || "";
    expect(svgClasses).toContain("text-line/40");
    expect(svgClasses).toContain("dark:text-line/25");

    // Mask containing radial-gradient with --glow-x and --glow-y
    const maskStyle = svg?.getAttribute("style") || "";
    expect(maskStyle).toContain("radial-gradient");
    expect(maskStyle).toContain("--glow-x");
    expect(maskStyle).toContain("--glow-y");
  });

  it("renders Glacier Circuit aurora glow elements with circuit lime, cyan, and ice blue", () => {
    const { container } = render(<CyberBackground />);

    // Circuit lime blob
    const limeBlob = container.querySelector('[class*="bg-lime/10"]');
    expect(limeBlob).toBeInTheDocument();
    expect(limeBlob?.className).toContain("blur-3xl");

    // Cyan blob
    const cyanBlob = container.querySelector('[class*="bg-teal-500/10"]');
    expect(cyanBlob).toBeInTheDocument();
    expect(cyanBlob?.className).toContain("blur-3xl");

    // Ice blue blob
    const blueBlob = container.querySelector('[class*="bg-sky-500/10"]');
    expect(blueBlob).toBeInTheDocument();
    expect(blueBlob?.className).toContain("blur-3xl");

    // Glow wrapper positioning referencing --glow-x and --glow-y
    const glowWrapper = limeBlob?.parentElement;
    expect(glowWrapper).toBeInTheDocument();
    const wrapperStyle = glowWrapper?.getAttribute("style") || "";
    expect(wrapperStyle).toContain("var(--glow-x, 50%)");
    expect(wrapperStyle).toContain("var(--glow-y, 30%)");
  });

  it("tracks window pointermove events and updates glow coordinates via RAF lerp", () => {
    const { container } = render(<CyberBackground />);
    const root = container.firstChild as HTMLElement;

    // Initially styled with fallback 50% 30%
    expect(root.style.getPropertyValue("--glow-x")).toBe("50%");
    expect(root.style.getPropertyValue("--glow-y")).toBe("30%");

    // Move pointer
    fireEvent.pointerMove(window, { clientX: 200, clientY: 150 });

    // Tick animation frames
    act(() => {
      vi.advanceTimersByTime(20);
    });

    // Should have started updating towards target in pixels
    const updatedX = root.style.getPropertyValue("--glow-x");
    const updatedY = root.style.getPropertyValue("--glow-y");
    expect(updatedX).toMatch(/px$/);
    expect(updatedY).toMatch(/px$/);

    // Let lerp settle
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(root.style.getPropertyValue("--glow-x")).toBe("200px");
    expect(root.style.getPropertyValue("--glow-y")).toBe("150px");
  });

  it("disables pointer movement tracking and breathing animations when prefers-reduced-motion is active", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<CyberBackground />);
    const root = container.firstChild as HTMLElement;

    expect(root.style.getPropertyValue("--glow-x")).toBe("50%");
    expect(root.style.getPropertyValue("--glow-y")).toBe("30%");

    // Attempt pointer move
    fireEvent.pointerMove(window, { clientX: 300, clientY: 400 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Coordinates remain static 50% 30%
    expect(root.style.getPropertyValue("--glow-x")).toBe("50%");
    expect(root.style.getPropertyValue("--glow-y")).toBe("30%");

    // Check blobs do not have animate-pulse
    const limeBlob = container.querySelector('[class*="bg-lime/10"]');
    expect(limeBlob?.className).not.toContain("animate-pulse");
  });

  it("cleans up event listeners and cancels pending RAF on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const cancelAnimationFrameSpy = vi.spyOn(window, "cancelAnimationFrame");

    const { unmount } = render(<CyberBackground />);

    // Trigger pointer movement to schedule a RAF
    fireEvent.pointerMove(window, { clientX: 180, clientY: 220 });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
  });

  it("reacts dynamically to prefers-reduced-motion media query changes", () => {
    let mediaChangeHandler: ((e: MediaQueryListEvent) => void) | null = null;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === "change") mediaChangeHandler = handler;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<CyberBackground />);
    const root = container.firstChild as HTMLElement;

    // First, pointermove updates coordinates
    fireEvent.pointerMove(window, { clientX: 250, clientY: 350 });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root.style.getPropertyValue("--glow-x")).toBe("250px");

    // Now user switches system setting to reduce motion
    act(() => {
      mediaChangeHandler?.({ matches: true } as MediaQueryListEvent);
    });

    // Reset to static 50% 30%
    expect(root.style.getPropertyValue("--glow-x")).toBe("50%");
    expect(root.style.getPropertyValue("--glow-y")).toBe("30%");
  });
});
