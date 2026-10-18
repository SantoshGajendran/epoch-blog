# Phase 4: Home and the Neural Network Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the immersive Epoch home page featuring the living neural network map engine (Canvas 2D), interactive post neurons, signal cascades, topic filter chips, post preview card, accessible list view alternative, and hero section.

**Architecture:** A modular, framework-free TypeScript engine in `src/lib/network/` split into: (1) Graph Builder (`builder.ts`), (2) Physics & Geometry (`physics.ts`), (3) Signal Propagation (`signals.ts`), and (4) Canvas 2D Renderer (`renderer.ts`). A lightweight React integration layer in `src/components/network/` mounts the canvas, passes typed posts and config, handles keyboard navigation and touch gestures, and renders the floating post preview card and accessible list view.

**Tech Stack:** Next.js 15 (App Router), TypeScript (strict), Tailwind CSS ("Glacier Circuit"), Canvas 2D, Lucide icons, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-18-epoch-design.md`  
**Reference:** `reference/prototype.html` (specifically lines 220–264)

---

## Global Constraints
- Zero hardcoded domain terms in code (all names, copy, topic colors, cluster positions, graph physics, and UI labels live in `/config` validated via Zod).
- Adding a new topic or post must require ZERO component or engine edits: only a config entry or a new MDX file.
- TypeScript strict (`strict: true`, `noImplicitAny: true`, no `any`).
- Accessibility: keyboard navigable (Arrow keys move between post neurons, Enter opens preview, Escape clears selection), visible focus rings, WCAG AA contrast in both themes, `prefers-reduced-motion` respected everywhere.
- Performance: 60fps with 50+ posts on mid-range devices; DPR capped at 2; loop paused when off-screen or tab is hidden.
- Sentence case for all UI copy.

---

### Task 1: Graph Model & Pure Graph Builder

**Files:**
- Create: `src/lib/network/types.ts`
- Create: `src/lib/network/builder.ts`
- Create: `tests/network-builder.test.ts`

**Interfaces:**
- Produces: `NetworkGraph`, `Neuron`, `Connection`, `ThemeColors`, `SignalState` in `src/lib/network/types.ts`.
- Produces: `buildNetworkGraph(topics: TopicConfigItem[], graphConfig: GraphConfig, posts: Post[]): NetworkGraph` in `src/lib/network/builder.ts`.

- [ ] **Step 1: Write failing test for graph builder**
Create `tests/network-builder.test.ts` testing:
  - Generates correct number of clusters matching topics config.
  - Constructs 4 layers per cluster with dynamic posts layer sizing.
  - Correctly assigns post metadata to post neurons (`isPost: true`, `post: Post`).
  - Structural decorative neurons marked `isPost: false`.
  - Intra-cluster connections connect every neuron in layer $L$ to every neuron in layer $L+1$.
  - Inter-cluster connections connect configured source topics/layers to target topics/layers.
  - Handles adding a new topic dynamically without code changes.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/network-builder.test.ts` (Expected: FAIL).

- [ ] **Step 3: Implement types and graph builder**
Create `src/lib/network/types.ts` and `src/lib/network/builder.ts`:
  - Full TypeScript types with no `any`.
  - Pure function mapping inputs into flat `neurons` and `connections` arrays with fast adjacency lookups (`neuron.out`, `neuron.ins`).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/network-builder.test.ts` (Expected: PASS).

- [ ] **Step 5: Commit Task 1**
`git add src/lib/network/ tests/network-builder.test.ts && git commit -m "feat(network): implement pure graph builder and types"`

---

### Task 2: Physics, Geometry & Signal Propagation Engine

**Files:**
- Create: `src/lib/network/physics.ts`
- Create: `src/lib/network/signals.ts`
- Create: `tests/network-physics.test.ts`

**Interfaces:**
- Consumes: `NetworkGraph`, `Neuron`, `Connection` from `src/lib/network/types.ts`.
- Produces: `updatePhysics(graph: NetworkGraph, mouse: MouseState, dimensions: ViewportDimensions, config: GraphConfig, dt: number, now: number, isReducedMotion: boolean): void` in `src/lib/network/physics.ts`.
- Produces: `SignalSystem` class / helpers (`updateSignals`, `fireBurst`, `spawnAmbientSignal`) in `src/lib/network/signals.ts`.

- [ ] **Step 1: Write failing test for physics and signal systems**
Create `tests/network-physics.test.ts` testing:
  - Target coordinate calculations per cluster layout.
  - Spring velocity relaxation and damping.
  - Cursor repulsion force within configured radius.
  - Reduced motion mode sets static coordinates with zero velocity.
  - Signal propagation: step advances `t`, arrival flashes target neuron (`f = 1`), cascades to outgoing connection up to `maxDepth`.
  - Concurrency capping ensures active signals never exceed `maxConcurrent`.
  - `fireBurst` launches signals along all incoming and outgoing connections of the selected neuron.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/network-physics.test.ts` (Expected: FAIL).

- [ ] **Step 3: Implement physics solver and signal system**
Create `src/lib/network/physics.ts` and `src/lib/network/signals.ts`:
  - Pure mathematical calculations without DOM dependencies.
  - Smooth oscillation (`sin`/`cos` drift with phase offsets per neuron).
  - Cursor repulsion and velocity integration.
  - Signal lifecycle management with multi-stage trail interpolation.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/network-physics.test.ts` (Expected: PASS).

- [ ] **Step 5: Commit Task 2**
`git add src/lib/network/ tests/network-physics.test.ts && git commit -m "feat(network): implement physics solver and signal cascade system"`

---

### Task 3: Canvas 2D Renderer & Theme Integration

**Files:**
- Create: `src/lib/network/renderer.ts`
- Create: `tests/network-renderer.test.ts`

**Interfaces:**
- Consumes: `NetworkGraph`, `SignalSystem`, `ThemeColors` from `src/lib/network/`.
- Produces: `NetworkRenderer` class in `src/lib/network/renderer.ts`.
  - Methods: `render(state: RenderState): void`, `resize(width: number, height: number, dpr: number): void`, `pickNeuron(x: number, y: number): Neuron | null`, `setThemeColors(colors: ThemeColors): void`.

- [ ] **Step 1: Write failing test for renderer utilities and hit-testing**
Create `tests/network-renderer.test.ts` testing:
  - DPR calculation capped at 2.
  - Hit testing: `pickNeuron` correctly identifies closest post neuron within threshold radius.
  - Dimming logic: unselected topics dimmed when a topic filter is active.
  - Theme colors mapping from CSS custom variables.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/network-renderer.test.ts` (Expected: FAIL).

- [ ] **Step 3: Implement Canvas 2D Renderer**
Create `src/lib/network/renderer.ts`:
  - Ambient star layer with depth parallax.
  - Cluster outline containers with topic titles.
  - Synapse connections with alpha blending and animated dashes on selected paths.
  - Glowing signal pulses with 4-stage fading trails and shadow blur.
  - Post neurons (filled center + glowing ring) vs decorative neurons.
  - Selected neuron burst ripple and rotating dashed halo.
  - Pointer radial ice-blue glow.
  - Hover tooltip with Space Grotesk typography and rounded container.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/network-renderer.test.ts` (Expected: PASS).

- [ ] **Step 5: Commit Task 3**
`git add src/lib/network/ tests/network-renderer.test.ts && git commit -m "feat(network): implement canvas 2D renderer and theme color pipeline"`

---

### Task 4: Interactive React Component & Post Preview Card

**Files:**
- Create: `src/components/network/post-preview-card.tsx`
- Create: `src/components/network/network-map.tsx`
- Create: `tests/network-map.test.tsx`

**Interfaces:**
- Produces: `<NetworkMap posts={Post[]} selectedPostSlug={string | null} onSelectPost={(slug: string | null) => void} activeTopicId={string | null} />`.
- Produces: `<PostPreviewCard post={Post} onClose={() => void} />`.

- [ ] **Step 1: Write failing test for NetworkMap and PostPreviewCard**
Create `tests/network-map.test.tsx` testing:
  - Mounts `<canvas>` with `role="region"` and accessible aria-label.
  - Renders `PostPreviewCard` when a post is selected.
  - Keyboard navigation: Arrow keys cycle through post neurons, Enter selects, Escape deselects.
  - Canvas loop pauses when off-screen via `IntersectionObserver` or document visibility is hidden.
  - Reduced motion mode detected and passed to renderer.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/network-map.test.tsx` (Expected: FAIL).

- [ ] **Step 3: Implement PostPreviewCard and NetworkMap**
Create `src/components/network/post-preview-card.tsx` and `src/components/network/network-map.tsx`:
  - Responsive canvas mount with `ResizeObserver`.
  - Pointer event wiring with client coordinate normalization.
  - Touch support with `touch-action: pan-y` so vertical page scrolling is never hijacked.
  - Clean `requestAnimationFrame` loop management and `IntersectionObserver` auto-pause.
  - Theme change listener triggering color re-fetch.
  - Full keyboard accessibility with focus rings.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/network-map.test.tsx` (Expected: PASS).

- [ ] **Step 5: Commit Task 4**
`git add src/components/network/ tests/network-map.test.tsx && git commit -m "feat(network): implement NetworkMap canvas component and preview card"`

---

### Task 5: Topic Filter Chips, List View Alternative & Home Page

**Files:**
- Create: `src/components/network/topic-chips.tsx`
- Create: `src/components/network/post-list-view.tsx`
- Modify: `src/app/page.tsx`
- Create: `tests/home-page.test.tsx`

**Interfaces:**
- Produces: `<TopicChips topics={Topic[]} activeTopicId={string | null} onSelectTopic={(id: string | null) => void} viewMode={"map" | "list"} onViewModeChange={(mode: "map" | "list") => void} />`.
- Produces: `<PostListView posts={Post[]} activeTopicId={string | null} />`.
- Updates: `src/app/page.tsx` integrating Hero, TopicChips, NetworkMap, PostListView, and PrototypeHint.

- [ ] **Step 1: Write failing test for Home Page and controls**
Create `tests/home-page.test.tsx` testing:
  - Hero displays site name, tagline, and description from config.
  - Topic chips render "All topics" + each configured topic.
  - Clicking a topic chip updates filter state and dims other topics.
  - Segmented control switches between Map view and List view.
  - List view displays identical posts to map view, reachable by assistive tech.
  - Responsive layout down to 360px viewport.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/home-page.test.tsx` (Expected: FAIL).

- [ ] **Step 3: Implement TopicChips, PostListView, and Home Page**
Implement `src/components/network/topic-chips.tsx`, `src/components/network/post-list-view.tsx`, and update `src/app/page.tsx`:
  - All UI copy from `siteConfig.ui`.
  - Topic pill buttons with aria-pressed.
  - Segmented toggle with glacier circuit active styling (`bg-lime text-limeink`).
  - Accessible list view with topic color indicators, title, excerpt, and reading time.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/home-page.test.tsx` (Expected: PASS).

- [ ] **Step 5: Commit Task 5**
`git add src/components/network/ src/app/page.tsx tests/home-page.test.tsx && git commit -m "feat(home): assemble home page with topic chips, list view fallback, and hero"`

---

### Task 6: Phase 4 Acceptance Verification & DOD

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
Run: `npm run build` (Expected: Next.js SSG builds all pages including home page cleanly).
- [ ] **Step 5: Performance & A11y verification**
Verify 60fps canvas performance with 50+ posts, reduced-motion behavior, mobile 360px responsiveness, and WCAG AA contrast.
- [ ] **Step 6: Commit final Phase 4 milestone**
`git commit --allow-empty -m "milestone: complete Phase 4 Home and Neural Network Map acceptance verification"`
