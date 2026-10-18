# Phase 6: Immersion Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 6 of Epoch: progressive lazy-loaded Three.js 3D depth upgrade for the neural network map, an accessible interactive step-through architecture diagram component for technical posts, synthesized Web Audio micro-interactions, and visual polish.

**Architecture:** 
1. Configuration extensions in `/config/schemas/` and `/config/` with zero hardcoded domain terms.
2. Lightweight Web Audio API synthesizer for muted-by-default analog click feedback on interactions.
3. Interactive GSAP/React architecture diagram component in `src/components/post/interactive-diagram.tsx` integrated with MDX `<DiagramSlot>`.
4. Pure WebGL/Three.js renderer in `src/lib/network/three-renderer.ts` translating `NetworkGraph` to 3D with raycasting, camera drift/tilt, and reduced-motion fallback.
5. Lazy dynamic import (`next/dynamic`, `ssr: false`) for 3D stage with 2D/3D toggle, zero impact on initial 2D paint, and automatic fallback on mobile/low-power/reduced-motion.

**Tech Stack:** Next.js 15.1.7, React 19, Three.js, GSAP, Web Audio API, Vitest, Testing Library, Tailwind CSS, Zod.

**Spec:** `docs/superpowers/specs/2026-10-18-epoch-design.md`

## Global Constraints

- Zero hardcoded domain terms in code: all copy, 3D camera settings, diagram labels, and audio labels live in `/config/*.ts` and are validated by Zod.
- Adding a new topic or post requires zero edits to engine or component code.
- Strict TypeScript (`strict: true`, `noImplicitAny: true`, no `any`).
- Full accessibility: WCAG AA contrast in both themes, visible focus rings, full keyboard operability for all interactive elements, and strict adherence to `prefers-reduced-motion`.
- Performance: initial page paint is never blocked by Three.js; 3D bundles are loaded strictly on demand via `next/dynamic`.
- Audio is 100% opt-in (muted by default), uses Web Audio API (zero external sound files), and respects mute preferences.
- Sentence case for all UI labels.

---

### Task 1: Configuration Extensions & Web Audio Synthesizer

**Files:**
- Modify: `config/schemas/graph.ts`
- Modify: `config/graph.ts`
- Modify: `config/schemas/site.ts`
- Modify: `config/site.ts`
- Create: `src/lib/audio/sound-effects.ts`
- Create: `src/lib/audio/sound-provider.tsx`
- Modify: `src/components/layout/header.tsx`
- Test: `tests/audio-effects.test.ts`
- Test: `tests/config-immersion.test.ts`

**Interfaces:**
- Produces:
  - `graphConfig.three`: `{ cameraFov: number, depthSpread: number, tiltSensitivity: number, ambientDriftSpeed: number }`
  - `siteConfig.ui`: labels for 2D/3D mode switch, sound toggle, diagram controls.
  - `soundEffects`: `{ playNodeSelectSound: () => void, playActionTick: () => void }`
  - `useSound`: `{ isSoundEnabled: boolean, toggleSound: () => void, playSound: (type: "select" | "tick") => void }`

- [x] **Step 1: Write failing tests for immersion configuration and audio synthesizer**
  - Verify Zod schemas validate 3D configuration and UI labels.
  - Verify audio synthesizer instantiates, handles SSR safely, respects mute state, and catches AudioContext policies.
- [x] **Step 2: Run tests to verify failure**
- [x] **Step 3: Update configuration schemas and config files**
  - Add `three` config to `config/schemas/graph.ts` and `config/graph.ts`.
  - Add UI labels (`viewMode2dLabel`, `viewMode3dLabel`, `soundToggleAriaLabel`, `diagramPreviousStepLabel`, `diagramNextStepLabel`, etc.) to `config/schemas/site.ts` and `config/site.ts`.
- [x] **Step 4: Implement `src/lib/audio/sound-effects.ts` and `src/lib/audio/sound-provider.tsx`**
  - Synthesize ~880Hz soft damped click for node select and ~440Hz tick for UI actions using Web Audio API oscillator and gain nodes.
  - Guard against SSR and suspended AudioContext state.
  - Store opt-in sound preference in `localStorage` (`epoch_sound_enabled`), default `false`.
- [x] **Step 5: Add sound toggle button to `src/components/layout/header.tsx`**
  - Add accessible sound on/off button next to theme toggle and search button.
- [x] **Step 6: Run tests to verify all tests pass**
- [x] **Step 7: Commit changes**

---

### Task 2: Interactive Post Diagram Component (MDX & GSAP)

**Files:**
- Create: `src/components/post/interactive-diagram.tsx`
- Modify: `src/components/post/diagram-slot.tsx`
- Modify: `src/components/post/mdx-content.tsx`
- Test: `tests/interactive-diagram.test.tsx`

**Interfaces:**
- Consumes:
  - `siteConfig.ui.diagramPreviousStepLabel`, `diagramNextStepLabel`, `diagramStepPrefix`, `diagramOfPrefix`.
- Produces:
  - `<InteractiveDiagram steps={...} title={...} />`
  - Seamless integration with `<DiagramSlot name="agent-loop-trajectory" />`.

- [ ] **Step 1: Write failing tests for `InteractiveDiagram`**
  - Test step navigation (Next, Previous, direct step button click).
  - Test keyboard navigation (ArrowLeft, ArrowRight).
  - Test ARIA live region step announcement.
  - Test `prefers-reduced-motion` behavior (immediate state update, no animation delay).
  - Test integration when rendered inside `DiagramSlot`.
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement `src/components/post/interactive-diagram.tsx`**
  - State machine tracking `currentStep` (0 to N-1).
  - GSAP or smooth CSS transitions for step node activation, active outline glow, and explanation panel crossfade.
  - Accessible previous/next buttons and step indicator pills.
  - ARIA live region (`aria-live="polite"`) announcing the active step title and description.
  - Default preset for `agent-loop-trajectory` (Agent Tool Loop Architecture) with 4 technical steps: Planning, Actuation, Environment Feedback, Trajectory Evaluation.
- [ ] **Step 4: Update `src/components/post/diagram-slot.tsx` and `mdx-content.tsx`**
  - Render `InteractiveDiagram` when `name === "agent-loop-trajectory"` (or custom diagram prop).
  - Ensure all labels use `siteConfig.ui`.
- [ ] **Step 5: Run tests to verify all tests pass**
- [ ] **Step 6: Commit changes**

---

### Task 3: Pure Three.js 3D WebGL Neural Renderer

**Files:**
- Create: `src/lib/network/three-renderer.ts`
- Modify: `src/lib/network/index.ts`
- Test: `tests/three-renderer.test.ts`

**Interfaces:**
- Consumes:
  - `NetworkGraph`, `Neuron`, `Connection`, `ThemeColors`, `graphConfig.three`.
- Produces:
  - Class `ThreeNetworkRenderer`:
    - `constructor(canvas: HTMLCanvasElement, config: GraphConfig)`
    - `resize(width: number, height: number, dpr?: number): void`
    - `setThemeColors(colors: ThemeColors): void`
    - `setGraph(graph: NetworkGraph): void`
    - `setHighlightedTopic(topicId: string | null): void`
    - `setSelectedNeuron(neuron: Neuron | null): void`
    - `pickNeuron(clientX: number, clientY: number, rect: DOMRect): Neuron | null`
    - `setCursor(x: number, y: number): void`
    - `render(dt: number, now: number, isReducedMotion: boolean): void`
    - `dispose(): void`

- [ ] **Step 1: Write failing unit tests for `ThreeNetworkRenderer`**
  - Mock WebGL context / Three.js objects for test environment.
  - Verify initialization, node/connection object creation, depth calculation, raycasting hit detection, and clean disposal.
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement `src/lib/network/three-renderer.ts`**
  - Three.js scene, perspective camera, WebGLRenderer with alpha and antialias.
  - Map 2D graph $(x, y)$ coordinates to 3D scene $(x, y, z)$ with layer-dependent depth spread.
  - Post neurons rendered with distinct glowing spherical geometry and outer halo ring.
  - Structural/decorative neurons rendered with lightweight translucent meshes.
  - Connections rendered with Three.js `LineSegments` or tube geometry with theme-colored materials.
  - Raycaster for pointer hover and click detection.
  - Camera tilt driven by cursor coordinates; slow ambient camera drift (disabled in reduced motion).
  - Complete memory cleanup: dispose geometries, materials, renderer context.
- [ ] **Step 4: Export `ThreeNetworkRenderer` from `src/lib/network/index.ts`**
- [ ] **Step 5: Run tests to verify all tests pass**
- [ ] **Step 6: Commit changes**

---

### Task 4: Dynamic 3D Stage & 2D/3D Mode Integration

**Files:**
- Create: `src/components/network/network-map-3d.tsx`
- Modify: `src/components/network/topic-chips.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/network-3d.test.tsx`

**Interfaces:**
- Consumes:
  - `ThreeNetworkRenderer`, `useSound`, `siteConfig.ui.viewMode2dLabel`, `siteConfig.ui.viewMode3dLabel`.
- Produces:
  - Dynamic 3D map component with lazy loading, 2D/3D dimension switch in controls, and audio trigger integration.

- [ ] **Step 1: Write failing tests for `NetworkMap3D` and dimension switch**
  - Test 3D map canvas mount and interaction callbacks.
  - Test 2D/3D toggle button in `TopicChips`.
  - Test keyboard navigation in 3D mode (Arrow keys, Enter, Escape).
  - Test sound trigger on post neuron selection.
  - Test automatic 2D fallback on mobile or reduced-motion.
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement `src/components/network/network-map-3d.tsx`**
  - Client component managing `ThreeNetworkRenderer` instance with `ResizeObserver`, `IntersectionObserver`, and `visibilitychange` auto-pause.
  - Touch handling preserving vertical scroll (`touch-action: pan-y`).
  - Keyboard navigation (canvas `tabIndex={0}`, Arrow keys, Enter, Escape).
  - Displays `PostPreviewCard` on post selection.
  - Plays sound click via `useSound()` on neuron selection.
- [ ] **Step 4: Update `src/components/network/topic-chips.tsx`**
  - Add 2D / 3D segmented toggle button next to Map / List view toggle when Map view is active.
  - Hidden or disabled on mobile (< 768px) and when `prefers-reduced-motion` is active, cleanly defaulting to 2D.
- [ ] **Step 5: Update `src/app/page.tsx`**
  - Lazy load `NetworkMap3D` using `next/dynamic` (`ssr: false, loading: () => <NetworkMapFallback />`).
  - Switch between 2D canvas `NetworkMap` and 3D WebGL `NetworkMap3D` based on dimension state.
  - Wire sound effects on post selection from map or command palette.
- [ ] **Step 6: Run tests to verify all tests pass**
- [ ] **Step 7: Commit changes**

---

### Task 5: Whole-Phase Acceptance Verification & Polish

**Files:**
- Modify any files needing visual polish or accessibility refinements.
- Review and verify all criteria.

- [ ] **Step 1: Run typecheck (`npm run typecheck`)**
- [ ] **Step 2: Run linter (`npm run lint`)**
- [ ] **Step 3: Run full test suite (`npm run test`)**
- [ ] **Step 4: Run production build (`npm run build`)**
- [ ] **Step 5: Verify zero hardcoded domain terms across new code**
- [ ] **Step 6: Verify reduced motion and mobile accessibility**
- [ ] **Step 7: Final Phase 6 review and commit**
