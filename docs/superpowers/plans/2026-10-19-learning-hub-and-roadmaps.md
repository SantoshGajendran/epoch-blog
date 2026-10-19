# Learning Hub, Roadmaps & Engineering Tips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Epoch into a daily engineering destination by building the Learning Hub (`/learn`) with interactive Learning Paths, milestone checklists, Series roadmaps, a copyable Tips & Tricks vault, multi-badge filtering, and persistent progress tracking.

**Architecture:** A content-driven learning engine powered by two new Velite MDX collections (`content/paths/` and `content/tips/`), local browser progress storage (`localStorage`), interactive filter state (`BadgeFilterBar`), circuit roadmap components (`LearningPathCard`), 1-click copyable spotlight tip cards (`TipCard`), and search indexing in `MiniSearch`.

**Tech Stack:** Next.js 15, React 19, Velite MDX, TypeScript (strict), Tailwind CSS, Lucide icons, Web Audio API, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-19-learning-hub-and-roadmaps-design.md`

## Global Constraints
- **Zero Hardcoded Domain Terms**: All copy and UI labels come strictly from `siteConfig.ui` and topic/badge configurations.
- **Strict TypeScript**: `strict: true`, `noImplicitAny: true`, zero `any`.
- **Accessibility & Motion**: Semantic `role="tablist"`, `role="tab"`, `role="checkbox"`, `aria-checked`; full `prefers-reduced-motion` compliance.
- **Sentence Case**: All user-facing UI labels must follow sentence case.
- **Performance Budget**: Fast static pre-rendering (Next.js SSG), DPR capped at 2.0, zero layout shifts.

---

### Task 1: Velite Collections & Seed Content for Paths & Tips

**Files:**
- Modify: `velite.config.ts`
- Modify: `src/lib/content/types.ts`
- Modify: `src/lib/content/queries.ts`
- Create: `content/paths/llm-systems-engineering.mdx`
- Create: `content/paths/autonomous-agents.mdx`
- Create: `content/tips/pytorch-cuda-alloc-conf.mdx`
- Create: `content/tips/vllm-speculative-tokens.mdx`
- Create: `content/tips/rag-hybrid-rerank.mdx`
- Test: `tests/content-learning-schema.test.ts`

**Interfaces:**
- Consumes: Velite `defineCollection`, `s`.
- Produces:
  - `paths` and `tips` collections in Velite
  - `Path` and `Tip` interfaces in `src/lib/content/types.ts`
  - `getAllPaths(): Path[]`
  - `getAllTips(): Tip[]`
  - `getPathById(id: string): Path | undefined`

- [ ] **Step 1: Write failing test for paths and tips schemas**

```typescript
// tests/content-learning-schema.test.ts
import { describe, it, expect } from "vitest";
import { getAllPaths, getAllTips, getPathById } from "@/lib/content";

describe("Learning Content Collections Schema", () => {
  it("loads learning paths with required milestones and estimated hours", () => {
    const paths = getAllPaths();
    expect(paths.length).toBeGreaterThanOrEqual(2);

    const llmPath = getPathById("llm-systems-engineering");
    expect(llmPath).toBeDefined();
    expect(llmPath?.title).toContain("LLM");
    expect(llmPath?.steps.length).toBeGreaterThan(0);
    expect(llmPath?.estimatedHours).toBeGreaterThan(0);
  });

  it("loads engineering tips with code snippets and badges", () => {
    const tips = getAllTips();
    expect(tips.length).toBeGreaterThanOrEqual(3);

    const cudaTip = tips.find((t) => t.id === "pytorch-cuda-alloc-conf");
    expect(cudaTip).toBeDefined();
    expect(cudaTip?.codeSnippet).toContain("PYTORCH_CUDA_ALLOC_CONF");
    expect(cudaTip?.badges.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- tests/content-learning-schema.test.ts`
Expected: FAIL with `getAllPaths` not exported.

- [ ] **Step 3: Define Velite collections, seed MDX files, and queries**
Update `velite.config.ts` with `paths` and `tips`.
Update `src/lib/content/types.ts` and `src/lib/content/queries.ts`.
Create `content/paths/llm-systems-engineering.mdx`, `content/paths/autonomous-agents.mdx`.
Create `content/tips/pytorch-cuda-alloc-conf.mdx`, `content/tips/vllm-speculative-tokens.mdx`, `content/tips/rag-hybrid-rerank.mdx`.
Run `npx velite build --strict`.

- [ ] **Step 4: Run tests to verify pass**
Run: `npm run test -- tests/content-learning-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**
`git add velite.config.ts src/lib/content/ content/paths/ content/tips/ tests/content-learning-schema.test.ts`
`git commit -m "feat(content): add velite collections and seed content for paths and tips"`

---

### Task 2: Configuration Labels & Progress Storage Engine

**Files:**
- Modify: `config/schemas/site.ts`
- Modify: `config/site.ts`
- Create: `src/lib/learn/progress-storage.ts`
- Test: `tests/progress-storage.test.ts`
- Test: `tests/config-learning.test.ts`

**Interfaces:**
- Consumes: None.
- Produces:
  - `siteConfig.ui.navLearnLabel`: "Learn"
  - `siteConfig.ui.learnHubTitle`: "Learning Hub"
  - `siteConfig.ui.learnHubTagline`: "Structured paths, deep-dive series, and production tips for modern AI systems engineering."
  - `siteConfig.ui.tabPathsLabel`: "Learning paths"
  - `siteConfig.ui.tabSeriesLabel`: "Series roadmaps"
  - `siteConfig.ui.tabTipsLabel`: "Tips & tricks"
  - `siteConfig.ui.copySnippetLabel`: "Copy snippet"
  - `siteConfig.ui.copiedSnippetLabel`: "Copied!"
  - `siteConfig.ui.progressCompletedLabel`: "Completed"
  - `siteConfig.ui.milestonesLabel`: "Milestones"
  - `siteConfig.ui.filterAllLabel`: "All"
  - Storage API in `src/lib/learn/progress-storage.ts`:
    - `getCompletedSteps(): Set<string>`
    - `toggleStepCompletion(stepKey: string): boolean`
    - `isStepCompleted(stepKey: string): boolean`
    - `getPathProgress(pathId: string, stepIds: string[]): { completed: number; total: number; percentage: number }`

- [ ] **Step 1: Write failing tests for progress storage and config**

```typescript
// tests/progress-storage.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  getCompletedSteps,
  toggleStepCompletion,
  isStepCompleted,
  getPathProgress,
} from "@/lib/learn/progress-storage";

describe("Progress Storage Engine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("toggles step completion and persists to localStorage", () => {
    expect(isStepCompleted("path1:step1")).toBe(false);

    const nowComplete = toggleStepCompletion("path1:step1");
    expect(nowComplete).toBe(true);
    expect(isStepCompleted("path1:step1")).toBe(true);

    const nowIncomplete = toggleStepCompletion("path1:step1");
    expect(nowIncomplete).toBe(false);
    expect(isStepCompleted("path1:step1")).toBe(false);
  });

  it("calculates path progress percentage accurately", () => {
    toggleStepCompletion("llm:s1");
    toggleStepCompletion("llm:s2");

    const progress = getPathProgress("llm", ["llm:s1", "llm:s2", "llm:s3", "llm:s4"]);
    expect(progress.completed).toBe(2);
    expect(progress.total).toBe(4);
    expect(progress.percentage).toBe(50);
  });
});
```

```typescript
// tests/config-learning.test.ts
import { describe, it, expect } from "vitest";
import { siteConfig } from "@config/index";

describe("Learning Hub Configuration", () => {
  it("validates sentence-case labels for learning navigation and controls", () => {
    expect(siteConfig.ui.navLearnLabel).toBe("Learn");
    expect(siteConfig.ui.learnHubTitle).toBe("Learning Hub");
    expect(siteConfig.ui.tabPathsLabel).toBe("Learning paths");
    expect(siteConfig.ui.tabSeriesLabel).toBe("Series roadmaps");
    expect(siteConfig.ui.tabTipsLabel).toBe("Tips & tricks");
    expect(siteConfig.ui.copySnippetLabel).toBe("Copy snippet");
    expect(siteConfig.ui.copiedSnippetLabel).toBe("Copied!");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**
Run: `npm run test -- tests/progress-storage.test.ts tests/config-learning.test.ts`
Expected: FAIL with missing storage functions and config labels.

- [ ] **Step 3: Implement config labels and `progress-storage.ts`**
Add labels to `config/schemas/site.ts` and `config/site.ts`.
Create `src/lib/learn/progress-storage.ts` with SSR guards and storage error handling.

- [ ] **Step 4: Run tests to verify pass**
Run: `npm run test -- tests/progress-storage.test.ts tests/config-learning.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**
`git add config/ src/lib/learn/ tests/progress-storage.test.ts tests/config-learning.test.ts`
`git commit -m "feat(learn): implement learning config labels and persistent progress storage"`

---

### Task 3: Interactive Badges, Progress Ticker & Tip Cards

**Files:**
- Create: `src/components/learn/learning-stats-bar.tsx`
- Create: `src/components/learn/badge-filter-bar.tsx`
- Create: `src/components/learn/tip-card.tsx`
- Test: `tests/badge-filter.test.tsx`
- Test: `tests/tip-card.test.tsx`

**Interfaces:**
- Consumes: `siteConfig.ui`, `useOptionalSound()`, `<SpotlightCard>`.
- Produces:
  - `<LearningStatsBar completedMilestones={number} totalMilestones={number} activeTracks={number} totalTips={number} />`
  - `<BadgeFilterBar availableBadges={string[]} activeBadges={Set<string>} onToggleBadge={(badge: string) => void} onClear={() => void} itemCounts={Record<string, number>} />`
  - `<TipCard tip={Tip} onCopy?: () => void />`

- [ ] **Step 1: Write failing tests for BadgeFilterBar and TipCard**

```typescript
// tests/badge-filter.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BadgeFilterBar } from "@/components/learn/badge-filter-bar";

describe("BadgeFilterBar Component", () => {
  it("renders badges with counts and handles click toggles", () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();

    render(
      <BadgeFilterBar
        availableBadges={["LLM", "RAG", "Setup"]}
        activeBadges={new Set(["LLM"])}
        onToggleBadge={onToggle}
        onClear={onClear}
        itemCounts={{ LLM: 4, RAG: 2, Setup: 3 }}
      />
    );

    const llmBtn = screen.getByRole("button", { name: /LLM/i });
    expect(llmBtn).toHaveAttribute("aria-pressed", "true");

    const ragBtn = screen.getByRole("button", { name: /RAG/i });
    fireEvent.click(ragBtn);
    expect(onToggle).toHaveBeenCalledWith("RAG");
  });
});
```

```typescript
// tests/tip-card.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TipCard } from "@/components/learn/tip-card";

describe("TipCard Component", () => {
  it("renders tip badges, code snippet, and executes copy action", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    const mockTip = {
      id: "test-tip",
      title: "Optimizing KV Cache",
      summary: "Reduce memory overhead.",
      badges: ["LLM", "Infra"],
      codeSnippet: "export VLLM_ATTENTION_BACKEND=FLASHINFER",
      copyLabel: "Copy snippet",
      order: 1,
      body: "",
    };

    render(<TipCard tip={mockTip} />);

    expect(screen.getByText("Optimizing KV Cache")).toBeInTheDocument();
    expect(screen.getByText(/VLLM_ATTENTION_BACKEND/i)).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: /copy snippet/i });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "export VLLM_ATTENTION_BACKEND=FLASHINFER"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify failure**
Run: `npm run test -- tests/badge-filter.test.tsx tests/tip-card.test.tsx`
Expected: FAIL with components missing.

- [ ] **Step 3: Implement components**
Create `src/components/learn/learning-stats-bar.tsx`.
Create `src/components/learn/badge-filter-bar.tsx`.
Create `src/components/learn/tip-card.tsx` with `<SpotlightCard>` and clipboard copy.

- [ ] **Step 4: Run tests to verify pass**
Run: `npm run test -- tests/badge-filter.test.tsx tests/tip-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit changes**
`git add src/components/learn/ tests/badge-filter.test.tsx tests/tip-card.test.tsx`
`git commit -m "feat(learn): implement badge filter bar, learning stats ticker, and tip card"`

---

### Task 4: Learning Path Circuit Cards & Series Roadmaps View

**Files:**
- Create: `src/components/learn/learning-path-card.tsx`
- Create: `src/components/learn/series-roadmap-view.tsx`
- Test: `tests/learning-path-card.test.tsx`
- Test: `tests/series-roadmap.test.tsx`

**Interfaces:**
- Consumes: `Path`, `Series`, `Post`, `progressStorage`, `<SpotlightCard>`.
- Produces:
  - `<LearningPathCard path={Path} onToggleStep={(stepKey: string) => void} isCompleted={(stepKey: string) => boolean} />`
  - `<SeriesRoadmapView seriesList={Series[]} posts={Post[]} />`

- [ ] **Step 1: Write failing tests for LearningPathCard and SeriesRoadmapView**

```typescript
// tests/learning-path-card.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LearningPathCard } from "@/components/learn/learning-path-card";

describe("LearningPathCard Component", () => {
  it("renders path milestone circuit nodes and toggles completion", () => {
    const onToggle = vi.fn();
    const mockPath = {
      id: "llm-path",
      title: "LLM Systems Engineering",
      summary: "Production serving architecture.",
      badge: "LLM",
      level: "Advanced" as const,
      estimatedHours: 4,
      order: 1,
      steps: [
        {
          id: "step-1",
          title: "PagedAttention Deep Dive",
          description: "Virtual memory layouts.",
          postSlug: "infra-vllm-speculative-decoding",
          type: "article" as const,
        },
      ],
      body: "",
    };

    render(
      <LearningPathCard
        path={mockPath}
        onToggleStep={onToggle}
        isCompleted={() => false}
      />
    );

    expect(screen.getByText("LLM Systems Engineering")).toBeInTheDocument();
    expect(screen.getByText("PagedAttention Deep Dive")).toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith("llm-path:step-1");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**
Run: `npm run test -- tests/learning-path-card.test.tsx tests/series-roadmap.test.tsx`
Expected: FAIL with components missing.

- [ ] **Step 3: Implement components**
Create `src/components/learn/learning-path-card.tsx` with circuit line connecting milestones and progress bar.
Create `src/components/learn/series-roadmap-view.tsx` rendering multi-part series with chapter links.

- [ ] **Step 4: Run tests to verify pass**
Run: `npm run test -- tests/learning-path-card.test.tsx tests/series-roadmap.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit changes**
`git add src/components/learn/ tests/learning-path-card.test.tsx tests/series-roadmap.test.tsx`
`git commit -m "feat(learn): implement learning path circuit cards and series roadmaps view"`

---

### Task 5: Learning Hub Page (`/learn`), Navigation & Search Indexing

**Files:**
- Create: `src/app/learn/page.tsx`
- Modify: `src/components/layout/header.tsx`
- Modify: `src/lib/search/types.ts`
- Modify: `src/lib/search/index.ts`
- Test: `tests/learning-hub-page.test.tsx`
- Test: `tests/learning-search.test.ts`

**Interfaces:**
- Consumes: `getAllPaths()`, `getAllTips()`, `getAllSeries()`, `getAllPosts()`, `siteConfig.ui`.
- Produces:
  - Top-level `/learn` App Router route with SSG.
  - Header navigation link: `navLearnLabel` ("Learn") -> `/learn`.
  - Search indexing for `"path"` and `"tip"` items in `MiniSearch`.

- [ ] **Step 1: Write failing tests for `/learn` page and search indexing**

```typescript
// tests/learning-hub-page.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LearnPage from "@/app/learn/page";

describe("Learning Hub Page", () => {
  it("renders Learning Hub with tabs for paths, series, and tips", () => {
    render(<LearnPage />);

    expect(screen.getByText(/learning hub/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /learning paths/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /series roadmaps/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /tips & tricks/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**
Run: `npm run test -- tests/learning-hub-page.test.tsx tests/learning-search.test.ts`
Expected: FAIL with page missing.

- [ ] **Step 3: Implement `src/app/learn/page.tsx`, Header link, and search indexing**
Create `src/app/learn/page.tsx` with tabs, filter bar, and views.
Update `src/components/layout/header.tsx` to include `Learn` navigation link.
Update `src/lib/search/types.ts` and `src/lib/search/index.ts` to index tips and paths.

- [ ] **Step 4: Run tests to verify pass**
Run: `npm run test -- tests/learning-hub-page.test.tsx tests/learning-search.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**
`git add src/app/learn/ src/components/layout/header.tsx src/lib/search/ tests/learning-hub-page.test.tsx tests/learning-search.test.ts`
`git commit -m "feat(learn): implement learning hub page, header navigation link, and search index integration"`

---

### Task 6: Whole-Phase Acceptance Verification & Deployment Build

**Files:**
- Visual polish, dark/light theme audit, mobile responsiveness.

- [ ] **Step 1: Run TypeScript typecheck**
Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 2: Run Next.js linter**
Run: `npm run lint`
Expected: 0 warnings, 0 errors.

- [ ] **Step 3: Run full Vitest test suite**
Run: `npm run test`
Expected: All test suites passing.

- [ ] **Step 4: Run production build**
Run: `npm run build`
Expected: Velite strict build succeeds, Next.js generates static pages including `/learn`.

- [ ] **Step 5: Push update to GitHub and verify Vercel deployment**
Run: `git push origin master ; git push origin master:main`
Expected: Live deployment automatically triggered on Vercel.

- [ ] **Step 6: Milestone commit**
`git commit -m "milestone: complete learning hub, roadmaps, and engineering tips acceptance verification"`
