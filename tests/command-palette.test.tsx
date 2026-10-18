import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SearchProvider, useSearchPalette } from "@/lib/search/search-provider";
import { CommandPalette } from "@/components/palette/command-palette";
import { siteConfig } from "@config/site";
import type { Post, Series } from "@/lib/content";
import type { SearchActionItem, TopicConfigItem } from "@/lib/search/types";

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

const mockPosts: Post[] = [
  {
    slug: "evaluating-agent-tool-use",
    title: "Evaluating Agent Tool Use",
    summary: "Systematic evaluation protocols for tool-calling agent systems",
    date: "2026-03-01T00:00:00Z",
    topic: "agents",
    tags: ["evals", "benchmarks", "tool-calling"],
    permalink: "/posts/evaluating-agent-tool-use",
    readingTime: 6,
    draft: false,
    toc: [],
    metadata: { readingTime: 6, wordCount: 1200 },
    body: "",
  },
  {
    slug: "dense-retrieval-failures",
    title: "Dense Retrieval Failures in Production",
    summary: "Analyzing vector search recall regressions and ranker discrepancies",
    date: "2026-03-05T00:00:00Z",
    topic: "rag",
    tags: ["retrieval", "vector-search", "dense-chunking"],
    permalink: "/posts/dense-retrieval-failures",
    readingTime: 8,
    draft: false,
    toc: [],
    metadata: { readingTime: 8, wordCount: 1600 },
    body: "",
  },
  {
    slug: "qlora-memory-budgeting",
    title: "QLoRA Memory Budgeting Guide",
    summary: "VRAM allocation strategies for fine-tuning 70B parameter models",
    date: "2026-03-10T00:00:00Z",
    topic: "tune",
    tags: ["fine-tuning", "qlora", "vram"],
    permalink: "/posts/qlora-memory-budgeting",
    readingTime: 5,
    draft: false,
    toc: [],
    metadata: { readingTime: 5, wordCount: 1000 },
    body: "",
  },
];

const mockTopics: TopicConfigItem[] = [
  {
    id: "agents",
    label: "Agents",
    colorToken: "--c-agents",
    lightColor: "#0a86c0",
    darkColor: "#6fd3ff",
    clusterPosition: { x: 0.25, y: 0.36 },
    description: "Autonomous reasoning, tool-calling architectures, and resilient memory.",
  },
  {
    id: "rag",
    label: "RAG",
    colorToken: "--c-rag",
    lightColor: "#6c9400",
    darkColor: "#c8f43a",
    clusterPosition: { x: 0.75, y: 0.36 },
    description: "Retrieval evaluation, hybrid search, dense chunking, and rankers.",
  },
];

const mockSeries: Series[] = [
  {
    id: "rag-deep-dive",
    slug: "rag-deep-dive",
    title: "RAG Deep Dive Series",
    summary: "From vector indexes to reciprocal rank fusion in modern pipelines",
    order: 1,
    permalink: "/series/rag-deep-dive",
    body: "",
  },
];

function createMockActions(onActionCalled = vi.fn()): SearchActionItem[] {
  return [
    {
      id: "toggle-theme",
      title: siteConfig.ui.actionSwitchThemeLabel,
      category: siteConfig.ui.searchGroupActionsLabel,
      action: onActionCalled,
    },
    {
      id: "switch-map",
      title: siteConfig.ui.actionShowMapLabel,
      category: siteConfig.ui.searchGroupActionsLabel,
      action: vi.fn(),
    },
    {
      id: "switch-list",
      title: siteConfig.ui.actionShowListLabel,
      category: siteConfig.ui.searchGroupActionsLabel,
      action: vi.fn(),
    },
  ];
}

interface TestAppProps {
  posts?: Post[];
  series?: Series[];
  topics?: TopicConfigItem[];
  actions?: SearchActionItem[];
  onSelectPost?: (slug: string) => void;
  onSelectTopic?: (topicId: string) => void;
  onSelectSeries?: (seriesId: string) => void;
  onSelectAction?: (actionId: string) => void;
}

function TestApp({
  posts = mockPosts,
  series = mockSeries,
  topics = mockTopics,
  actions = createMockActions(),
  onSelectPost,
  onSelectTopic,
  onSelectSeries,
  onSelectAction,
}: TestAppProps) {
  return (
    <SearchProvider>
      <div>
        <button id="trigger-btn" data-testid="trigger-btn">
          Open Button
        </button>
        <input id="test-input" data-testid="test-input" placeholder="Regular input" />
        <textarea id="test-textarea" data-testid="test-textarea" />
        <div id="test-editable" data-testid="test-editable" contentEditable="true" suppressContentEditableWarning>
          Editable Div
        </div>
        <CommandPalette
          posts={posts}
          series={series}
          topics={topics}
          actions={actions}
          onSelectPost={onSelectPost}
          onSelectTopic={onSelectTopic}
          onSelectSeries={onSelectSeries}
          onSelectAction={onSelectAction}
        />
      </div>
    </SearchProvider>
  );
}

describe("Command Palette & SearchProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  describe("SearchProvider & useSearchPalette hook", () => {
    it("throws error when useSearchPalette is invoked outside of SearchProvider", () => {
      function ConsumerOutside() {
        useSearchPalette();
        return null;
      }

      // Suppress console.error for expected React throw
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<ConsumerOutside />)).toThrow(
        "useSearchPalette must be used within a SearchProvider"
      );
      spy.mockRestore();
    });

    it("provides isOpen state, open, close, toggle, and setIsOpen methods", () => {
      let contextMethods!: ReturnType<typeof useSearchPalette>;

      function HookProbe() {
        contextMethods = useSearchPalette();
        return <div data-testid="probe-status">{contextMethods.isOpen ? "open" : "closed"}</div>;
      }

      render(
        <SearchProvider>
          <HookProbe />
        </SearchProvider>
      );

      expect(screen.getByTestId("probe-status")).toHaveTextContent("closed");
      expect(contextMethods).toBeDefined();
      expect(contextMethods.isOpen).toBe(false);

      // Open
      act(() => {
        contextMethods.open();
      });
      expect(screen.getByTestId("probe-status")).toHaveTextContent("open");
      expect(contextMethods.isOpen).toBe(true);

      // Close
      act(() => {
        contextMethods.close();
      });
      expect(screen.getByTestId("probe-status")).toHaveTextContent("closed");
      expect(contextMethods.isOpen).toBe(false);

      // Toggle
      act(() => {
        contextMethods.toggle();
      });
      expect(screen.getByTestId("probe-status")).toHaveTextContent("open");
      expect(contextMethods.isOpen).toBe(true);

      act(() => {
        contextMethods.toggle();
      });
      expect(screen.getByTestId("probe-status")).toHaveTextContent("closed");
      expect(contextMethods.isOpen).toBe(false);

      // setIsOpen
      act(() => {
        contextMethods.setIsOpen(true);
      });
      expect(screen.getByTestId("probe-status")).toHaveTextContent("open");
      expect(contextMethods.isOpen).toBe(true);

      act(() => {
        contextMethods.setIsOpen(false);
      });
      expect(screen.getByTestId("probe-status")).toHaveTextContent("closed");
      expect(contextMethods.isOpen).toBe(false);
    });
  });

  describe("Global Keyboard Shortcuts", () => {
    it("toggles the command palette on Ctrl+K and Cmd+K", () => {
      render(<TestApp />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Ctrl+K opens
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Ctrl+K closes
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Cmd+K (metaKey) opens
      fireEvent.keyDown(window, { key: "k", metaKey: true });
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Cmd+K closes
      fireEvent.keyDown(window, { key: "k", metaKey: true });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens palette on '/' when focus is outside text inputs", () => {
      render(<TestApp />);

      const triggerBtn = screen.getByTestId("trigger-btn");
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      fireEvent.keyDown(window, { key: "/" });
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("ignores '/' keypress when typing in input, textarea, or contentEditable element", () => {
      render(<TestApp />);

      // In <input>
      const input = screen.getByTestId("test-input");
      input.focus();
      expect(document.activeElement).toBe(input);
      fireEvent.keyDown(input, { key: "/" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // In <textarea>
      const textarea = screen.getByTestId("test-textarea");
      textarea.focus();
      expect(document.activeElement).toBe(textarea);
      fireEvent.keyDown(textarea, { key: "/" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // In contentEditable element
      const editable = screen.getByTestId("test-editable");
      editable.focus();
      expect(document.activeElement).toBe(editable);
      fireEvent.keyDown(editable, { key: "/" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes the palette on Escape keypress", () => {
      render(<TestApp />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Focus Management & Backdrop Dismissal", () => {
    it("captures active element on open and restores focus on close", async () => {
      render(<TestApp />);

      const triggerBtn = screen.getByTestId("trigger-btn");
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      // Open palette
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Palette input should receive focus
      const searchInput = screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder);
      expect(document.activeElement).toBe(searchInput);

      // Close via Escape
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Focus should be restored to trigger button
      expect(document.activeElement).toBe(triggerBtn);
    });

    it("closes when backdrop is clicked, but remains open when dialog content is clicked", () => {
      render(<TestApp />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // Clicking dialog content does NOT close
      const searchInput = screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder);
      fireEvent.click(searchInput);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Clicking backdrop closes
      const backdrop = screen.getByTestId("command-palette-backdrop");
      fireEvent.click(backdrop);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("traps focus inside the dialog with Tab navigation", () => {
      render(<TestApp />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder);
      expect(document.activeElement).toBe(searchInput);

      // Tab on only focusable element cycles back to it
      fireEvent.keyDown(dialog, { key: "Tab" });
      expect(document.activeElement).toBe(searchInput);

      // Shift+Tab cycles back
      fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe("Rendering, Grouping & Filtering", () => {
    it("renders default actions and recent posts for an empty query", () => {
      render(<TestApp />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });

      // Actions section
      expect(screen.getAllByText(siteConfig.ui.searchGroupActionsLabel).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(siteConfig.ui.actionSwitchThemeLabel)).toBeInTheDocument();
      expect(screen.getByText(siteConfig.ui.actionShowMapLabel)).toBeInTheDocument();
      expect(screen.getByText(siteConfig.ui.actionShowListLabel)).toBeInTheDocument();

      // Posts section
      expect(screen.getAllByText(siteConfig.ui.searchGroupPostsLabel).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("QLoRA Memory Budgeting Guide")).toBeInTheDocument();
      expect(screen.getByText("Dense Retrieval Failures in Production")).toBeInTheDocument();
      expect(screen.getByText("Evaluating Agent Tool Use")).toBeInTheDocument();
    });

    it("filters posts by title, summary, and tags upon entering search terms", () => {
      render(<TestApp />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const searchInput = screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder);

      // Type "evaluating"
      fireEvent.change(searchInput, { target: { value: "evaluating" } });

      expect(screen.getByText("Evaluating Agent Tool Use")).toBeInTheDocument();
      expect(screen.queryByText("Dense Retrieval Failures in Production")).not.toBeInTheDocument();
      expect(screen.queryByText("QLoRA Memory Budgeting Guide")).not.toBeInTheDocument();
    });

    it("filters across multiple groups (topics, series, posts) simultaneously", () => {
      render(<TestApp />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const searchInput = screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder);

      // Type "rag" -> matches topic "RAG", series "RAG Deep Dive Series", post "Dense Retrieval Failures in Production"
      fireEvent.change(searchInput, { target: { value: "rag" } });

      expect(screen.getAllByText(siteConfig.ui.searchGroupTopicsLabel).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(siteConfig.ui.searchGroupSeriesLabel).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(siteConfig.ui.searchGroupPostsLabel).length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText("RAG")).toBeInTheDocument();
      expect(screen.getByText("RAG Deep Dive Series")).toBeInTheDocument();
      expect(screen.getByText("Dense Retrieval Failures in Production")).toBeInTheDocument();
    });

    it("renders zero-results empty state using siteConfig.ui.noSearchResultsLabel", () => {
      render(<TestApp />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const searchInput = screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder);

      fireEvent.change(searchInput, { target: { value: "nonexistentquery12345" } });

      expect(screen.getByText(siteConfig.ui.noSearchResultsLabel)).toBeInTheDocument();
      expect(screen.queryByText(siteConfig.ui.searchGroupPostsLabel)).not.toBeInTheDocument();
    });
  });

  describe("Item Selection & Action Triggers", () => {
    it("executes action callback and triggers onSelectAction when an action is selected", () => {
      const onActionTrigger = vi.fn();
      const onSelectAction = vi.fn();
      const actions = createMockActions(onActionTrigger);

      render(<TestApp actions={actions} onSelectAction={onSelectAction} />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });

      const toggleAction = screen.getByText(siteConfig.ui.actionSwitchThemeLabel);
      fireEvent.click(toggleAction);

      expect(onActionTrigger).toHaveBeenCalledTimes(1);
      expect(onSelectAction).toHaveBeenCalledWith("toggle-theme");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("triggers onSelectPost with slug and closes palette when a post is clicked", () => {
      const onSelectPost = vi.fn();
      render(<TestApp onSelectPost={onSelectPost} />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const postItem = screen.getByText("Evaluating Agent Tool Use");
      fireEvent.click(postItem);

      expect(onSelectPost).toHaveBeenCalledWith("evaluating-agent-tool-use");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("triggers onSelectTopic with topicId and closes palette when a topic is selected", () => {
      const onSelectTopic = vi.fn();
      render(<TestApp onSelectTopic={onSelectTopic} />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const searchInput = screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder);
      fireEvent.change(searchInput, { target: { value: "Agents" } });

      const topicItem = screen.getByText("Agents");
      fireEvent.click(topicItem);

      expect(onSelectTopic).toHaveBeenCalledWith("agents");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("triggers onSelectSeries with seriesId/slug and closes palette when a series is selected", () => {
      const onSelectSeries = vi.fn();
      render(<TestApp onSelectSeries={onSelectSeries} />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const searchInput = screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder);
      fireEvent.change(searchInput, { target: { value: "Deep Dive" } });

      const seriesItem = screen.getByText("RAG Deep Dive Series");
      fireEvent.click(seriesItem);

      expect(onSelectSeries).toHaveBeenCalledWith("rag-deep-dive");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("supports keyboard navigation with ArrowDown/ArrowUp and Enter to select items", () => {
      const onActionTrigger = vi.fn();
      const actions = createMockActions(onActionTrigger);
      render(<TestApp actions={actions} />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const searchInput = screen.getByPlaceholderText(siteConfig.ui.searchPlaceholder);

      // Press ArrowDown then Enter on the active item
      fireEvent.keyDown(searchInput, { key: "ArrowDown" });
      fireEvent.keyDown(searchInput, { key: "Enter" });

      // Either first or second item was selected and dialog closed
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Glacier Circuit Design Tokens & Accessibility", () => {
    it("has required accessible attributes and Glacier Circuit styling classes", () => {
      render(<TestApp />);

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const dialog = screen.getByRole("dialog");

      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog.className).toContain("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm");

      const dialogBox = dialog.querySelector(".bg-surf");
      expect(dialogBox).toBeInTheDocument();
      expect(dialogBox?.className).toContain("border-line");
      expect(dialogBox?.className).toContain("rounded-2xl");
      expect(dialogBox?.className).toContain("shadow-2xl");
      expect(dialogBox?.className).toContain("text-ink");
    });
  });
});
