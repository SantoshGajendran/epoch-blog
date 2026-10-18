import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SearchProvider } from "@/lib/search/search-provider";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/palette/command-palette";
import Home from "@/app/page";
import { siteConfig } from "@config/site";
import { getAllPosts, getAllSeries } from "@/lib/content";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function setupCanvasMock() {
  const calls: { method: string; args: unknown[] }[] = [];
  const ctx = {
    canvas: {
      width: 800,
      height: 600,
      style: { width: "800px", height: "600px" },
    },
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "#000",
    fillStyle: "#000",
    font: "",
    textAlign: "left",
    shadowColor: "",
    shadowBlur: 0,
    lineDashOffset: 0,
    clearRect: vi.fn((...args: unknown[]) => calls.push({ method: "clearRect", args })),
    beginPath: vi.fn((...args: unknown[]) => calls.push({ method: "beginPath", args })),
    closePath: vi.fn((...args: unknown[]) => calls.push({ method: "closePath", args })),
    arc: vi.fn((...args: unknown[]) => calls.push({ method: "arc", args })),
    fill: vi.fn((...args: unknown[]) => calls.push({ method: "fill", args })),
    stroke: vi.fn((...args: unknown[]) => calls.push({ method: "stroke", args })),
    moveTo: vi.fn((...args: unknown[]) => calls.push({ method: "moveTo", args })),
    lineTo: vi.fn((...args: unknown[]) => calls.push({ method: "lineTo", args })),
    arcTo: vi.fn((...args: unknown[]) => calls.push({ method: "arcTo", args })),
    roundRect: vi.fn((...args: unknown[]) => calls.push({ method: "roundRect", args })),
    fillRect: vi.fn((...args: unknown[]) => calls.push({ method: "fillRect", args })),
    fillText: vi.fn((...args: unknown[]) => calls.push({ method: "fillText", args })),
    setLineDash: vi.fn((...args: unknown[]) => calls.push({ method: "setLineDash", args })),
    setTransform: vi.fn((...args: unknown[]) => calls.push({ method: "setTransform", args })),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    _calls: calls,
  };

  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
    if (contextId === "2d") return ctx;
    return null;
  });
}

describe("Search & Command Palette Global Integration", () => {
  const posts = getAllPosts();
  const series = getAllSeries();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");

    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    setupCanvasMock();

    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    let rafIdCounter = 0;
    vi.stubGlobal("requestAnimationFrame", (_cb: (time: number) => void) => {
      return ++rafIdCounter;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

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

  describe("Header Integration", () => {
    it("renders search shortcut label in header and opens palette on click", () => {
      render(
        <ThemeProvider>
          <SearchProvider>
            <Header />
            <CommandPalette posts={posts} series={series} />
          </SearchProvider>
        </ThemeProvider>
      );

      // Verify keyboard shortcut label in header
      expect(screen.getByText(siteConfig.ui.searchShortcutLabel)).toBeInTheDocument();

      // Initially closed
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Click Search button in Header
      const searchButton = screen.getByRole("button", {
        name: siteConfig.ui.searchAriaLabel,
      });
      fireEvent.click(searchButton);

      // Palette opens
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder)).toBeInTheDocument();

      // Click search button again to toggle close
      fireEvent.click(searchButton);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Home Page & Neural Map Selection", () => {
    it("selects post neuron, triggers burst/preview card, and switches to map view when post is selected on Home page", async () => {
      render(
        <ThemeProvider>
          <SearchProvider>
            <Header />
            <Home />
            <CommandPalette posts={posts} series={series} />
          </SearchProvider>
        </ThemeProvider>
      );

      // 1. Switch to list view first using the list view button in TopicChips
      const listButton = screen.getByRole("button", {
        name: siteConfig.ui.listViewLabel,
      });
      fireEvent.click(listButton);

      // Verify list view is active
      expect(screen.getByRole("list")).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: /map/i })).not.toBeInTheDocument();

      // 2. Open Command Palette via Header search button
      const searchButton = screen.getByRole("button", {
        name: siteConfig.ui.searchAriaLabel,
      });
      fireEvent.click(searchButton);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // 3. Select the first post from the palette dialog
      const targetPost = posts[0];
      const postItem = within(dialog).getByText(targetPost.title);
      fireEvent.click(postItem);

      // 4. Palette should close
      expect(
        screen.queryByRole("dialog", { name: siteConfig.ui.searchAriaLabel })
      ).not.toBeInTheDocument();

      // 5. Home page viewMode should switch back to 'map'
      expect(screen.getByRole("region", { name: /map/i })).toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();

      // 6. Post preview card for target post should be visible on map
      expect(screen.getByTestId("post-preview-card")).toBeInTheDocument();
      expect(screen.getByText(targetPost.title)).toBeInTheDocument();

      // 7. router.push should NOT have been called because Home page intercepted the selection
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("updates active topic filter when topic is selected from palette on Home page", () => {
      render(
        <ThemeProvider>
          <SearchProvider>
            <Home />
            <CommandPalette posts={posts} series={series} />
          </SearchProvider>
        </ThemeProvider>
      );

      // Open palette
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // Search and select Agents topic
      const searchInput = screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder);
      fireEvent.change(searchInput, { target: { value: "Agents" } });

      const topicItem = within(dialog).getByText("Agents");
      fireEvent.click(topicItem);

      // Palette closes
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Active topic chip should be active (e.g. aria-pressed="true")
      const agentsChip = screen.getByRole("button", { name: "Agents" });
      expect(agentsChip).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("Page Routing Navigation", () => {
    it("navigates via router.push when a post is selected without an interceptor registered", () => {
      // Render without Home page (standalone palette)
      render(
        <ThemeProvider>
          <SearchProvider>
            <CommandPalette posts={posts} series={series} />
          </SearchProvider>
        </ThemeProvider>
      );

      // Open palette
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Select first post
      const targetPost = posts[0];
      const postItem = screen.getByText(targetPost.title);
      fireEvent.click(postItem);

      // Palette closes and navigates via router.push
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mockPush).toHaveBeenCalledWith(`/posts/${targetPost.slug}`);
    });
  });

  describe("System Actions Execution", () => {
    it("toggles theme when 'Toggle theme' action is selected", () => {
      render(
        <ThemeProvider>
          <SearchProvider>
            <CommandPalette posts={posts} series={series} />
          </SearchProvider>
        </ThemeProvider>
      );

      // Default theme is dark
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

      // Open palette
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });

      // Click Toggle theme action
      const toggleThemeAction = screen.getByText(siteConfig.ui.actionSwitchThemeLabel);
      fireEvent.click(toggleThemeAction);

      // Palette closes
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Theme attribute toggles to light
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("switches view mode between map and list via palette actions", () => {
      render(
        <ThemeProvider>
          <SearchProvider>
            <Home />
            <CommandPalette posts={posts} series={series} />
          </SearchProvider>
        </ThemeProvider>
      );

      // Initially in map view
      expect(screen.getByRole("region", { name: /map/i })).toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();

      // Open palette
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });

      // Click 'Switch to list view'
      const switchToListAction = screen.getByText(siteConfig.ui.actionShowListLabel);
      fireEvent.click(switchToListAction);

      // View switched to list
      expect(screen.getByRole("list")).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: /map/i })).not.toBeInTheDocument();

      // Open palette again
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });

      // Click 'Switch to map view'
      const switchToMapAction = screen.getByText(siteConfig.ui.actionShowMapLabel);
      fireEvent.click(switchToMapAction);

      // View switched back to map
      expect(screen.getByRole("region", { name: /map/i })).toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });
});
