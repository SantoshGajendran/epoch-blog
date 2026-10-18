# Phase 5: Command Palette and Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the lightning-fast, accessible command palette (`cmdk`) and MiniSearch client search engine, navigable via `Ctrl/Cmd K` and `/`, enabling instant search across posts, topics, series, and actions (theme toggle, map/list view toggle), with direct synaptic map neuron bursts on selection.

**Architecture:** A fast in-memory search engine using `minisearch` in `src/lib/search/` indexing posts, topics, series, and system actions with sub-50ms latency. A global `SearchProvider` coordinates palette visibility and keyboard shortcuts (`Ctrl/Cmd K`, `/`, `Escape`). The `CommandPalette` component (`cmdk`) mounts in a high-contrast modal dialog, trapping and restoring focus, and dispatches actions across both the home page neural map and post reading routes.

**Tech Stack:** Next.js 15 (App Router), TypeScript (strict), Tailwind CSS ("Glacier Circuit"), cmdk, minisearch, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-18-epoch-design.md`  
**Reference:** `reference/prototype.html` (lines 57-64, 159-173)

---

## Global Constraints
- Zero hardcoded domain terms in code (all names, copy, search placeholders, group headers, and actions live in `/config` validated via Zod).
- Adding a new post, topic, or series must automatically index with ZERO component or search engine edits.
- TypeScript strict (`strict: true`, `noImplicitAny: true`, no `any`).
- Accessibility: fully keyboard operable (Arrow keys, Enter, Escape), focus trapped within modal and restored to trigger on close, `aria-modal="true"`, WCAG AA contrast in both themes, `prefers-reduced-motion` respected.
- Performance budget: search results rendered in under 50ms on all devices; lazy instantiation on first open.
- Sentence case for all UI copy.

---

### Task 1: Search Index Engine & MiniSearch Integration

**Files:**
- Modify: `package.json` (install `cmdk` and `minisearch`)
- Modify: `config/schemas/site.ts`
- Modify: `config/site.ts`
- Create: `src/lib/search/types.ts`
- Create: `src/lib/search/index.ts`
- Create: `tests/search-index.test.ts`

**Interfaces:**
- Produces: `SearchItem`, `SearchItemType` (`"post" | "topic" | "series" | "action"`), `SearchResult`, `SearchIndex` in `src/lib/search/types.ts`.
- Produces: `buildSearchIndex(posts: Post[], series: Series[], topics: TopicConfigItem[], actions: SearchActionItem[]): SearchEngine` in `src/lib/search/index.ts`.
- Produces: `searchEngine.search(query: string): SearchResult[]` with sub-50ms response time.

- [ ] **Step 1: Install dependencies**
Install `cmdk` and `minisearch`:
`npm install cmdk minisearch`

- [ ] **Step 2: Add search UI labels to config schema & site config**
Update `config/schemas/site.ts` and `config/site.ts` with sentence-case search group titles and action labels:
  - `actionSwitchThemeLabel: "Toggle theme"`
  - `actionShowMapLabel: "Switch to map view"`
  - `actionShowListLabel: "Switch to list view"`
  - `searchGroupPostsLabel: "Posts"`
  - `searchGroupTopicsLabel: "Topics"`
  - `searchGroupSeriesLabel: "Series"`
  - `searchGroupActionsLabel: "Actions"`

- [ ] **Step 3: Write failing test for search index engine**
Create `tests/search-index.test.ts` testing:
  - Generates index containing posts, topics, series, and actions.
  - Matches exact and prefix searches on title, summary, tags, and category labels.
  - Fuzzy searches tolerate minor typos (e.g., "eval" matches "evaluating", "retrevial" matches "retrieval").
  - Returns empty query default items (featured actions and recent posts).
  - Performance benchmark: query latency < 10ms for 50+ items (well below 50ms budget).

- [ ] **Step 4: Run test to verify failure**
Run: `npx vitest run tests/search-index.test.ts` (Expected: FAIL).

- [ ] **Step 5: Implement search types and MiniSearch engine**
Create `src/lib/search/types.ts` and `src/lib/search/index.ts`:
  - Strong typing with no `any`.
  - Configurable MiniSearch index on `title`, `summary`, `tags`, `category`.
  - Pure index builder and search query handler.

- [ ] **Step 6: Run test to verify it passes**
Run: `npx vitest run tests/search-index.test.ts` (Expected: PASS).

- [ ] **Step 7: Commit Task 1**
`git add package.json package-lock.json config/ src/lib/search/ tests/search-index.test.ts && git commit -m "feat(search): implement MiniSearch index engine and configuration"`

---

### Task 2: Command Palette Dialog Component

**Files:**
- Create: `src/components/palette/command-palette.tsx`
- Create: `src/lib/search/search-provider.tsx`
- Create: `tests/command-palette.test.tsx`

**Interfaces:**
- Produces: `<SearchProvider>{children}</SearchProvider>` with `useSearchPalette()` hook (`open`, `setOpen`, `toggle`).
- Produces: `<CommandPalette posts={Post[]} series={Series[]} onSelectPost?: (slug: string) => void />`.

- [ ] **Step 1: Write failing test for Command Palette component**
Create `tests/command-palette.test.tsx` testing:
  - Opens on `Ctrl+K`, `Cmd+K`, or `/` keypress.
  - Ignores `/` keypress when typing inside `<input>` or `<textarea>`.
  - Closes on `Escape` keypress or backdrop click.
  - Traps focus inside dialog while open, restores focus to trigger element on close.
  - Filters and groups results into Posts, Topics, Series, and Actions.
  - Navigates items using keyboard ArrowUp / ArrowDown, selects with Enter.
  - Renders zero-results state using `siteConfig.ui.noSearchResultsLabel`.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/command-palette.test.tsx` (Expected: FAIL).

- [ ] **Step 3: Implement SearchProvider and CommandPalette**
Create `src/lib/search/search-provider.tsx` and `src/components/palette/command-palette.tsx`:
  - `cmdk` dialog styled with Glacier Circuit dark/light tokens.
  - Selected item active styling (`data-[selected=true]:bg-lime data-[selected=true]:text-limeink`).
  - Search input with Space Grotesk styling and search icon.
  - Grouped sections with sentence-case headers.
  - Accessible dialog (`role="dialog"`, `aria-modal="true"`).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/command-palette.test.tsx` (Expected: PASS).

- [ ] **Step 5: Commit Task 2**
`git add src/components/palette/ src/lib/search/ tests/command-palette.test.tsx && git commit -m "feat(palette): implement cmdk command palette modal and search provider"`

---

### Task 3: Global Palette Wiring, Home Page & Map Integration

**Files:**
- Modify: `src/app/layout.tsx` (wrap with `SearchProvider` and mount `CommandPalette`)
- Modify: `src/components/layout/header.tsx` (wire search button to `useSearchPalette().toggle()`)
- Modify: `src/app/page.tsx` (wire post selection from palette to map neuron selection and signal burst)
- Create: `tests/search-integration.test.tsx`

**Interfaces:**
- Consumes: `useSearchPalette` in Header and Home page.
- Produces: Seamless cross-page search navigation with in-page neuron burst on Home page.

- [ ] **Step 1: Write failing test for search integration**
Create `tests/search-integration.test.tsx` testing:
  - Clicking Header search button opens the command palette.
  - Selecting a post on Home page selects that post neuron, switches to Map view if in List view, and fires burst.
  - Selecting a post on a post page navigates to `/posts/[slug]`.
  - Selecting an action (Toggle theme) toggles the theme.
  - Selecting an action (Switch to list view / map view) changes view mode.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/search-integration.test.tsx` (Expected: FAIL).

- [ ] **Step 3: Wire Header, Root Layout, and Home Page**
Update `src/app/layout.tsx`, `src/components/layout/header.tsx`, and `src/app/page.tsx`:
  - Header search button triggers palette.
  - Custom `onSelectPost` callback on Home page: updates `selectedPostSlug`, sets `viewMode` to `"map"`, closes palette.
  - Actions execute system state updates cleanly.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/search-integration.test.tsx` (Expected: PASS).

- [ ] **Step 5: Commit Task 3**
`git add src/app/layout.tsx src/components/layout/header.tsx src/app/page.tsx tests/search-integration.test.tsx && git commit -m "feat(search): wire command palette to header, theme toggle, and neural map"`

---

### Task 4: Phase 5 Acceptance Verification & DOD

**Files:**
- Audit: All repository files

**Verification Steps:**
- [ ] **Step 1: Run typecheck**
Run: `npm run typecheck` (Expected: exit code 0, 0 errors).
- [ ] **Step 2: Run full test suite**
Run: `npm run test` (Expected: all tests pass).
- [ ] **Step 3: Run linter**
Run: `npm run lint` (Expected: 0 warnings, 0 errors).
- [ ] **Step 4: Run production build**
Run: `npm run build` (Expected: Next.js SSG builds all pages cleanly).
- [ ] **Step 5: Sub-50ms latency & Accessibility audit**
Verify search query results render under 50ms, keyboard traps and restores focus, WCAG AA contrast in both themes.
- [ ] **Step 6: Commit final Phase 5 milestone**
`git commit --allow-empty -m "milestone: complete Phase 5 Command Palette and Search acceptance verification"`
