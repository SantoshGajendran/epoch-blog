# Phase 3: Post Reading Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comfortable, accessible, and immersive long-form technical post reading experience featuring sticky scroll-spy table of contents, smooth reading progress bar, key takeaways block, series navigation, related posts exploration, and share action with zero layout shift and full mobile responsiveness down to 360px.

**Architecture:** Individual post routes at `src/app/posts/[slug]/page.tsx` statically pre-render using `generateStaticParams` and typed Velite content. Client components (`ReadingProgress`, `TableOfContents`, `ShareButton`) handle scroll tracking and interaction via native browser APIs (`IntersectionObserver`, `window.addEventListener('scroll')`) wrapped with clean cleanup and `prefers-reduced-motion` guards. All labels and UI copy read from `@config/index`.

**Tech Stack:** Next.js 15.1.7, React 19, TypeScript strict, Tailwind CSS with `@tailwindcss/typography`, Lucide React, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-epoch-design.md`

## Global Constraints
- Zero hardcoded domain terms in code; all copy, labels, topic colors, and UI strings come from `@config/index`.
- Fully keyboard accessible: TOC links focusable with visible focus ring, smooth scrolling, keyboard-triggerable share button.
- WCAG AA contrast in both light and dark themes.
- `prefers-reduced-motion` respected everywhere: disable scroll animations, instant transitions.
- Comfortable on mobile at 360px width with no horizontal overflow and zero layout shift.
- Strict TypeScript (`strict: true`, `noImplicitAny: true`, no `any`).
- Sentence case for all UI labels.

---

### Task 1: Reading Progress Bar & Share Button

**Files:**
- Create: `src/components/post/reading-progress.tsx`
- Create: `src/components/post/share-button.tsx`
- Create: `tests/reading-progress.test.tsx`

**Interfaces:**
- Produces: `<ReadingProgress targetRef?: React.RefObject<HTMLElement>>` (renders top progress bar with `role="progressbar"`).
- Produces: `<ShareButton title={string} text={string} url={string} />` (copies link to clipboard or triggers Web Share API with visual toast feedback).

- [ ] **Step 1: Write failing tests for ReadingProgress and ShareButton**

Create `tests/reading-progress.test.tsx`:
```tsx
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
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/reading-progress.test.tsx`
Expected: FAIL ("Cannot find module '@/components/post/reading-progress'").

- [ ] **Step 3: Implement ReadingProgress component**

Create `src/components/post/reading-progress.tsx`:
```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ReadingProgressProps {
  className?: string;
}

export function ReadingProgress({ className }: ReadingProgressProps) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        setProgress(0);
        return;
      }
      const currentScroll = window.scrollY;
      const percentage = Math.min(100, Math.max(0, Math.round((currentScroll / scrollHeight) * 100)));
      setProgress(percentage);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent", className)}
    >
      <div
        className="h-full bg-lime transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Implement ShareButton component**

Create `src/components/post/share-button.tsx`:
```tsx
"use client";

import * as React from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@config/index";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title?: string;
  text?: string;
  url?: string;
  className?: string;
}

export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const shareData = {
      title: title || siteConfig.name,
      text: text || siteConfig.description,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard on error/cancellation
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      aria-label={copied ? siteConfig.ui.linkCopiedLabel : siteConfig.ui.sharePostLabel}
      className={cn("cursor-pointer font-sans gap-2 text-xs", className)}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
          <span className="text-lime">{siteConfig.ui.linkCopiedLabel}</span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5 text-mut" aria-hidden="true" />
          <span>{siteConfig.ui.sharePostLabel}</span>
        </>
      )}
    </Button>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/reading-progress.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/components/post/reading-progress.tsx src/components/post/share-button.tsx tests/reading-progress.test.tsx
git commit -m "feat(post): implement reading progress bar and share button"
```

---

### Task 2: Key Takeaways & Series Navigation

**Files:**
- Create: `src/components/post/key-takeaways.tsx`
- Create: `src/components/post/series-nav.tsx`
- Create: `tests/post-widgets.test.tsx`

**Interfaces:**
- Produces: `<KeyTakeaways summary={string} points?: string[] />` (displays takeaways block with circuit accent border).
- Produces: `<SeriesNav seriesId={string} currentSlug={string} />` (renders part counter, next/prev links).

- [ ] **Step 1: Write failing tests for KeyTakeaways and SeriesNav**

Create `tests/post-widgets.test.tsx`:
```tsx
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
    });
  });

  describe("SeriesNav", () => {
    it("renders series title, part indicator, and next/prev links for series post", () => {
      render(
        <SeriesNav
          seriesId="agentic-architectures"
          currentSlug="agents-autonomous-evals"
        />
      );

      expect(screen.getByText("Agentic Architectures")).toBeInTheDocument();
      // First post in 2-post series
      expect(screen.getByText(new RegExp(`${siteConfig.ui.seriesPartPrefix} 1 ${siteConfig.ui.seriesOfPrefix}`, "i"))).toBeInTheDocument();
      expect(screen.getByText(siteConfig.ui.nextPostLabel)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/post-widgets.test.tsx`
Expected: FAIL ("Cannot find module '@/components/post/key-takeaways'").

- [ ] **Step 3: Implement KeyTakeaways component**

Create `src/components/post/key-takeaways.tsx`:
```tsx
import * as React from "react";
import { Zap } from "lucide-react";
import { siteConfig } from "@config/index";
import { cn } from "@/lib/utils";

interface KeyTakeawaysProps {
  summary: string;
  points?: string[];
  className?: string;
}

export function KeyTakeaways({ summary, points, className }: KeyTakeawaysProps) {
  return (
    <div
      className={cn(
        "my-8 rounded-xl border border-line bg-surf/80 p-6 backdrop-blur-sm relative overflow-hidden",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold tracking-wide text-ink uppercase font-mono">
          {siteConfig.ui.keyTakeawaysTitle}
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-ink/90 font-sans">{summary}</p>
      {points && points.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line/60 pt-3 text-sm text-mut">
          {points.map((point, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span className="flex-1 text-ink/80">{point}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement SeriesNav component**

Create `src/components/post/series-nav.tsx`:
```tsx
import * as React from "react";
import Link from "next/link";
import { Layers, ArrowLeft, ArrowRight } from "lucide-react";
import { getSeriesById } from "@/lib/content";
import { siteConfig } from "@config/index";
import { cn } from "@/lib/utils";

interface SeriesNavProps {
  seriesId: string;
  currentSlug: string;
  className?: string;
}

export function SeriesNav({ seriesId, currentSlug, className }: SeriesNavProps) {
  const seriesData = getSeriesById(seriesId);
  if (!seriesData) return null;

  const { series, posts } = seriesData;
  const currentIndex = posts.findIndex((p) => p.slug === currentSlug);
  if (currentIndex === -1) return null;

  const currentOrder = currentIndex + 1;
  const totalParts = posts.length;
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const nextPost = currentIndex < totalParts - 1 ? posts[currentIndex + 1] : null;

  return (
    <aside
      aria-label="Series navigation"
      className={cn(
        "my-8 rounded-xl border border-line bg-surf p-5 text-sm",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-semibold text-ink">{series.title}</span>
        </div>
        <span className="text-xs font-mono text-mut">
          {siteConfig.ui.seriesPartPrefix} {currentOrder} {siteConfig.ui.seriesOfPrefix} {totalParts}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {prevPost ? (
          <Link
            href={prevPost.permalink}
            className="flex items-center gap-2.5 rounded-lg border border-line p-3 hover:border-primary/60 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 text-mut group-hover:text-primary shrink-0 transition-colors" />
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-mut">{siteConfig.ui.previousPostLabel}</div>
              <div className="text-xs font-medium text-ink truncate group-hover:text-primary transition-colors">
                {prevPost.title}
              </div>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {nextPost ? (
          <Link
            href={nextPost.permalink}
            className="flex items-center justify-between gap-2.5 rounded-lg border border-line p-3 hover:border-primary/60 transition-colors group sm:text-right"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono text-mut">{siteConfig.ui.nextPostLabel}</div>
              <div className="text-xs font-medium text-ink truncate group-hover:text-primary transition-colors">
                {nextPost.title}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-mut group-hover:text-primary shrink-0 transition-colors" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/post-widgets.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/components/post/key-takeaways.tsx src/components/post/series-nav.tsx tests/post-widgets.test.tsx
git commit -m "feat(post): implement key takeaways block and series navigation widget"
```

---

### Task 3: Sticky Table of Contents with Scroll-Spy & Mobile Support

**Files:**
- Create: `src/components/post/table-of-contents.tsx`
- Create: `tests/table-of-contents.test.tsx`

**Interfaces:**
- Produces: `<TableOfContents toc={Post["toc"]} />` (renders sticky sidebar on desktop, responsive collapsible on mobile).
- Features: Highlights active section using IntersectionObserver scroll-spy; keyboard navigation.

- [ ] **Step 1: Write failing TOC test**

Create `tests/table-of-contents.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TableOfContents } from "@/components/post/table-of-contents";
import { siteConfig } from "@config/index";

const mockToc = [
  {
    title: "Trajectory Invariance Testing",
    url: "#trajectory-invariance-testing",
    items: [
      {
        title: "Termination Boundary Guarantees",
        url: "#termination-boundary-guarantees",
      },
    ],
  },
  {
    title: "Evaluation Metrics",
    url: "#evaluation-metrics",
  },
];

describe("TableOfContents Component", () => {
  beforeEach(() => {
    // Mock IntersectionObserver
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it("renders table of contents title from siteConfig and heading items", () => {
    render(<TableOfContents toc={mockToc} />);
    expect(screen.getByText(siteConfig.ui.tableOfContentsTitle)).toBeInTheDocument();
    expect(screen.getByText("Trajectory Invariance Testing")).toBeInTheDocument();
    expect(screen.getByText("Termination Boundary Guarantees")).toBeInTheDocument();
    expect(screen.getByText("Evaluation Metrics")).toBeInTheDocument();
  });

  it("renders links with proper href anchors", () => {
    render(<TableOfContents toc={mockToc} />);
    const link = screen.getByRole("link", { name: "Trajectory Invariance Testing" });
    expect(link).toHaveAttribute("href", "#trajectory-invariance-testing");
  });

  it("toggles mobile collapse view on click", () => {
    render(<TableOfContents toc={mockToc} />);
    const trigger = screen.getByRole("button", { name: new RegExp(siteConfig.ui.tableOfContentsTitle, "i") });
    expect(trigger).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/table-of-contents.test.tsx`
Expected: FAIL ("Cannot find module '@/components/post/table-of-contents'").

- [ ] **Step 3: Implement TableOfContents component with scroll-spy**

Create `src/components/post/table-of-contents.tsx`:
```tsx
"use client";

import * as React from "react";
import { ChevronDown, AlignLeft } from "lucide-react";
import { siteConfig } from "@config/index";
import { cn } from "@/lib/utils";

export interface TocItem {
  title: string;
  url: string;
  items?: TocItem[];
}

interface TableOfContentsProps {
  toc: TocItem[];
  className?: string;
}

export function TableOfContents({ toc, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = React.useState<string>("");
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!toc || toc.length === 0) return;

    const extractIds = (items: TocItem[]): string[] => {
      let ids: string[] = [];
      for (const item of items) {
        if (item.url && item.url.startsWith("#")) {
          ids.push(item.url.slice(1));
        }
        if (item.items) {
          ids = ids.concat(extractIds(item.items));
        }
      }
      return ids;
    };

    const ids = extractIds(toc);
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "0px 0px -60% 0px",
        threshold: 0.1,
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  if (!toc || toc.length === 0) return null;

  const renderItems = (items: TocItem[], level = 0) => {
    return (
      <ul className={cn("space-y-2 text-xs", level > 0 && "pl-3 mt-2 border-l border-line/60")}>
        {items.map((item, idx) => {
          const id = item.url.startsWith("#") ? item.url.slice(1) : "";
          const isActive = id === activeId;

          return (
            <li key={idx}>
              <a
                href={item.url}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block py-0.5 leading-snug transition-colors focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "font-medium text-primary"
                    : "text-mut hover:text-ink"
                )}
              >
                {item.title}
              </a>
              {item.items && item.items.length > 0 && renderItems(item.items, level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <nav
      aria-label="Table of contents"
      className={cn("text-ink", className)}
    >
      {/* Mobile Accordion */}
      <div className="lg:hidden my-6 rounded-lg border border-line bg-surf p-3">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-mut cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <AlignLeft className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {siteConfig.ui.tableOfContentsTitle}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", mobileOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        {mobileOpen && <div className="mt-3 pt-3 border-t border-line/60">{renderItems(toc)}</div>}
      </div>

      {/* Desktop Sticky Sidebar */}
      <div className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
        <h4 className="text-xs font-mono uppercase tracking-wider text-mut mb-4 flex items-center gap-2">
          <AlignLeft className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>{siteConfig.ui.tableOfContentsTitle}</span>
        </h4>
        {renderItems(toc)}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/table-of-contents.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/components/post/table-of-contents.tsx tests/table-of-contents.test.tsx
git commit -m "feat(post): implement sticky scroll-spy table of contents"
```

---

### Task 4: Related Posts & Full Post Reading Page

**Files:**
- Create: `src/components/post/related-posts.tsx`
- Create: `src/app/posts/[slug]/page.tsx`
- Create: `tests/post-page.test.tsx`

**Interfaces:**
- Produces: `<RelatedPosts post={Post} />` (renders 2-3 contextual related posts with topic badges and summaries).
- Produces: `/posts/[slug]` post reading page with reading progress, header, key takeaways, series nav, MDX content, TOC, related posts, and back button.

- [ ] **Step 1: Write failing test for PostPage and RelatedPosts**

Create `tests/post-page.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PostPage, { generateStaticParams } from "@/app/posts/[slug]/page";
import { RelatedPosts } from "@/components/post/related-posts";
import { getPostBySlug } from "@/lib/content";
import { siteConfig } from "@config/index";

describe("Post Reading Page & Related Posts", () => {
  beforeEach(() => {
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it("generates static params for all seed posts", async () => {
    const params = await generateStaticParams();
    expect(params.length).toBeGreaterThanOrEqual(6);
    expect(params.some((p) => p.slug === "agents-autonomous-evals")).toBe(true);
  });

  it("renders related posts component with topic badge", () => {
    const post = getPostBySlug("agents-autonomous-evals");
    expect(post).toBeDefined();
    if (post) {
      render(<RelatedPosts post={post} />);
      expect(screen.getByText(siteConfig.ui.relatedPostsTitle)).toBeInTheDocument();
    }
  });

  it("renders complete post page with title, takeaways, and MDX content", async () => {
    const pageComponent = await PostPage({
      params: Promise.resolve({ slug: "agents-autonomous-evals" }),
    });

    render(pageComponent);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Evaluating Autonomous Agent Tool Loops");
    expect(screen.getByText(siteConfig.ui.keyTakeawaysTitle)).toBeInTheDocument();
    expect(screen.getByText(siteConfig.ui.backToMapLabel)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/post-page.test.tsx`
Expected: FAIL ("Cannot find module '@/components/post/related-posts'").

- [ ] **Step 3: Implement RelatedPosts component**

Create `src/components/post/related-posts.tsx`:
```tsx
import * as React from "react";
import Link from "next/link";
import { getRelatedPosts, type Post } from "@/lib/content";
import { siteConfig, topicsConfig } from "@config/index";
import { cn } from "@/lib/utils";

interface RelatedPostsProps {
  post: Post;
  className?: string;
}

export function RelatedPosts({ post, className }: RelatedPostsProps) {
  const related = getRelatedPosts(post, 3);
  if (!related || related.length === 0) return null;

  return (
    <section
      aria-label="Related explorations"
      className={cn("my-16 border-t border-line pt-12", className)}
    >
      <h3 className="text-xl font-bold tracking-tight text-ink mb-6">
        {siteConfig.ui.relatedPostsTitle}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {related.map((item) => {
          const topic = topicsConfig.topics.find((t) => t.id === item.topic);
          const colorToken = topic?.colorToken || "--a";

          return (
            <Link
              key={item.slug}
              href={item.permalink}
              className="flex flex-col justify-between rounded-xl border border-line bg-surf p-5 transition-all hover:border-primary/50 group"
            >
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: `var(${colorToken})` }}
                  />
                  <span className="text-xs font-semibold text-mut">
                    {topic?.label || item.topic}
                  </span>
                </div>
                <h4 className="text-base font-bold text-ink leading-snug group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p className="mt-2 text-xs text-mut leading-relaxed line-clamp-2">
                  {item.summary}
                </p>
              </div>
              <div className="mt-4 text-[11px] font-mono text-mut/80">
                {item.readingTime} {siteConfig.ui.minReadSuffix}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement PostPage route**

Create `src/app/posts/[slug]/page.tsx`:
```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllPosts, getPostBySlug } from "@/lib/content";
import { siteConfig, topicsConfig } from "@config/index";
import { MDXContent } from "@/components/post/mdx-content";
import { ReadingProgress } from "@/components/post/reading-progress";
import { TableOfContents } from "@/components/post/table-of-contents";
import { KeyTakeaways } from "@/components/post/key-takeaways";
import { SeriesNav } from "@/components/post/series-nav";
import { ShareButton } from "@/components/post/share-button";
import { RelatedPosts } from "@/components/post/related-posts";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: `Not Found — ${siteConfig.name}`,
    };
  }

  const topic = topicsConfig.topics.find((t) => t.id === post.topic);

  return {
    title: `${post.title} — ${siteConfig.name}`,
    description: post.summary,
    alternates: {
      canonical: `${siteConfig.url}${post.permalink}`,
    },
    openGraph: {
      title: post.title,
      description: post.summary,
      url: `${siteConfig.url}${post.permalink}`,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated || post.date,
      tags: post.tags,
      section: topic?.label,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const topic = topicsConfig.topics.find((t) => t.id === post.topic);
  const colorToken = topic?.colorToken || "--a";
  const postUrl = `${siteConfig.url}${post.permalink}`;

  return (
    <>
      <ReadingProgress />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation & Topic Bar */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-mut hover:text-ink transition-colors focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{siteConfig.ui.backToMapLabel}</span>
          </Link>

          <ShareButton title={post.title} text={post.summary} url={postUrl} />
        </div>

        {/* Article Header */}
        <header className="max-w-3xl mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: `color-mix(in srgb, var(${colorToken}) 12%, transparent)`,
                color: `var(${colorToken})`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `var(${colorToken})` }}
              />
              {topic?.label || post.topic}
            </span>
            <span className="text-xs text-mut font-mono">
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-mut">•</span>
            <span className="text-xs text-mut font-mono">
              {post.readingTime} {siteConfig.ui.minReadSuffix}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.08] mb-4">
            {post.title}
          </h1>

          <p className="text-lg text-mut leading-relaxed">
            {post.summary}
          </p>
        </header>

        {/* Key Takeaways */}
        <div className="max-w-3xl">
          <KeyTakeaways summary={post.summary} />
        </div>

        {/* Series Banner (if part of series) */}
        {post.series && (
          <div className="max-w-3xl">
            <SeriesNav seriesId={post.series.id} currentSlug={post.slug} />
          </div>
        )}

        {/* Two-Column Grid: Main Content + Sticky TOC */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-8">
          <article className="lg:col-span-8 min-w-0 prose prose-slate dark:prose-invert max-w-none text-ink font-sans text-base leading-relaxed">
            <MDXContent code={post.body} />
          </article>

          <aside className="lg:col-span-4">
            <TableOfContents toc={post.toc} />
          </aside>
        </div>

        {/* Bottom Series Nav */}
        {post.series && (
          <div className="max-w-3xl mt-12">
            <SeriesNav seriesId={post.series.id} currentSlug={post.slug} />
          </div>
        )}

        {/* Related Posts */}
        <RelatedPosts post={post} />
      </main>
    </>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/post-page.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/components/post/related-posts.tsx src/app/posts/ tests/post-page.test.tsx
git commit -m "feat(post): assemble complete post reading experience page"
```

---

### Task 5: Phase 3 Acceptance Verification (DOD)

**Files:**
- Audit: All repository files

**Verification Steps:**
- [ ] **Step 1: Run typecheck**
Run: `npm run typecheck`
Expected: Exit code 0, no errors.
- [ ] **Step 2: Run test suite**
Run: `npm run test`
Expected: All tests pass.
- [ ] **Step 3: Run linter**
Run: `npm run lint`
Expected: 0 warnings, 0 errors.
- [ ] **Step 4: Run production build**
Run: `npm run build`
Expected: Next.js static export generates all 6 post routes (`/posts/agents-autonomous-evals`, etc.).
- [ ] **Step 5: Verify mobile viewport (360px) & accessibility**
Verify: No horizontal scroll on mobile viewport, TOC accessible by keyboard.
- [ ] **Step 6: Commit final Phase 3 milestone**
```bash
git commit --allow-empty -m "milestone: complete Phase 3 Post Reading Experience acceptance verification"
```
