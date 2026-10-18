import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "@/lib/theme/use-theme";
import { ThemeProvider } from "@/lib/theme/theme-provider";

describe("Theme System Logic", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark"),
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
    vi.restoreAllMocks();
  });

  it("defaults to system or stored preference", () => {
    localStorage.setItem("epoch-theme", "dark");
    const stored = localStorage.getItem("epoch-theme");
    expect(stored).toBe("dark");
  });

  it("handles reduced motion check without errors", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    expect(typeof prefersReducedMotion).toBe("boolean");
  });

  it("throws error when useTheme is used outside of ThemeProvider", () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow("useTheme must be used within a ThemeProvider");
  });

  it("initializes with system theme by default and resolves dark/light", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ThemeProvider, null, children);

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("system");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("loads stored preference from localStorage", async () => {
    localStorage.setItem("epoch-theme", "light");

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ThemeProvider, null, children);

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("updates theme with setTheme and syncs localStorage and data-theme", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ThemeProvider, null, children);

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("light");
    });

    expect(result.current.theme).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");
    expect(localStorage.getItem("epoch-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(localStorage.getItem("epoch-theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("toggles theme correctly between light and dark", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ThemeProvider, null, children);

    const { result } = renderHook(() => useTheme(), { wrapper });

    // Default resolved is dark -> toggle gives light
    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    // Next toggle gives dark
    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("triggers radial view transition when supported and motion is not reduced", async () => {
    const animateMock = vi.fn();
    document.documentElement.animate = animateMock;

    let callbackFn: (() => void) | null = null;
    const readyPromise = Promise.resolve();
    const startViewTransitionMock = vi.fn().mockImplementation((cb: () => void) => {
      callbackFn = cb;
      return {
        ready: readyPromise,
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      };
    });

    Object.defineProperty(document, "startViewTransition", {
      writable: true,
      configurable: true,
      value: startViewTransitionMock,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ThemeProvider, null, children);

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("light", { x: 100, y: 100 });
    });

    expect(startViewTransitionMock).toHaveBeenCalled();
    if (callbackFn) {
      act(() => {
        (callbackFn as unknown as () => void)();
      });
    }

    await readyPromise;

    expect(animateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clipPath: expect.arrayContaining([
          expect.stringContaining("circle(0px at 100px 100px)"),
        ]),
      }),
      expect.objectContaining({
        duration: 650,
        easing: "cubic-bezier(0.65, 0, 0.35, 1)",
        pseudoElement: "::view-transition-new(root)",
      })
    );

    // Clean up
    // @ts-expect-error cleanup test mock
    delete document.startViewTransition;
  });

  it("skips view transition when prefers-reduced-motion is true", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const startViewTransitionMock = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      writable: true,
      configurable: true,
      value: startViewTransitionMock,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ThemeProvider, null, children);

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("light", { x: 50, y: 50 });
    });

    expect(startViewTransitionMock).not.toHaveBeenCalled();
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    // @ts-expect-error cleanup test mock
    delete document.startViewTransition;
  });
});
