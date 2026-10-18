# Epoch: Architecture & System Design

**Date**: 2026-10-18  
**Project**: Epoch (Immersive Tech and AI Blog)  
**Status**: Approved Design  

---

## 1. Vision & Core Principles

Epoch is an immersive personal tech and AI blog covering autonomous agents, RAG architectures, fine-tuning methodologies, and scalable AI infrastructure.

### The Metaphor
The name **Epoch** represents one complete cycle through the training data. Every technical post represents another pass at understanding modern artificial intelligence.

### Core Principles
1. **Immersion Serves Content**: Visual flair and interactive graphics exist to clarify mental models and aid post discovery—never obstructing readability or degrading performance.
2. **Zero Hardcoded Domain Terms**: Topic definitions, network cluster coordinates, colors, titles, copy, navigation links, and graph physics live exclusively in typed, validated configuration files (`/config/*.ts`). Adding a new topic or post requires zero edits to engine or component code.
3. **Accessibility Floor**: WCAG AA contrast in both light and dark themes, keyboard navigability across the entire canvas and UI, visible focus rings, and full compliance with `prefers-reduced-motion`. The network map always offers a 1:1 accessible list-view alternative.
4. **Performance Budget**: 60fps on mid-range hardware for 50+ posts, Lighthouse 90+ on mobile devices, and zero unnecessary runtime dependencies. Heavy visual upgrades (e.g. Three.js) are strictly progressive enhancements.

---

## 2. System Architecture

```
d:\Santosh\Development\blog\
├── config/                     # Zero hardcoded terms - all site & graph data
│   ├── schemas/                # Zod schemas for runtime & build validation
│   │   ├── site.ts
│   │   ├── nav.ts
│   │   ├── topics.ts
│   │   └── graph.ts
│   ├── site.ts                 # Site title, tagline, UI copy, social links
│   ├── nav.ts                  # Header nav items, actions
│   ├── topics.ts               # Topics, cluster positions, color tokens
│   ├── graph.ts                # Neural topology, layers, physics, timings
│   └── index.ts                # Validated configuration aggregator
├── content/                    # Typed MDX content (Velite)
│   ├── posts/                  # Technical blog posts (.mdx)
│   └── series/                 # Series definitions
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── globals.css         # "Glacier Circuit" CSS token system
│   │   ├── layout.tsx          # Root layout shell with ThemeProvider
│   │   ├── page.tsx            # Home page (Hero + Neural Map / List)
│   │   └── posts/[slug]/       # Reading experience (TOC, progress, prose)
│   ├── components/
│   │   ├── layout/             # Header, Logo, ThemeToggle, Footer
│   │   ├── network/            # Canvas 2D container, Controls, PreviewCard
│   │   ├── palette/            # cmdk command palette modal
│   │   ├── post/               # TOC, CodeBlock, ReadingProgress, Callout
│   │   └── ui/                 # Accessible primitives (Button, Chip, Kbd)
│   └── lib/
│       ├── network/            # Pure TypeScript graph engine (zero React deps)
│       │   ├── builder.ts      # Generates nodes, clusters, layers & connections
│       │   ├── physics.ts      # Spring dynamics, cursor repulsion, floating
│       │   ├── signals.ts      # Forward pass, backpropagation, bridge sparks
│       │   ├── camera.ts       # 2.5D parallax, cluster focus zoom & pan
│       │   └── renderer.ts     # Canvas 2D render loop, theme synchronization
│       ├── content/            # Velite collections & post query helpers
│       ├── search/             # Build-time indexed search engine
│       ├── theme/              # ThemeProvider & radial View Transition logic
│       └── utils.ts            # Formatting, class utilities
└── tests/                      # Vitest unit & integration test suites
    ├── config.test.ts
    ├── graph-builder.test.ts
    └── physics.test.ts
```

---

## 3. Design System: "Glacier Circuit"

### Color Tokens
- **Dark Theme (Default)**:
  - Base: `#14181c` (deep graphite)
  - Surface: `#1c2227` (elevated cards, canvas background)
  - Primary / Accent (`--a`): `#6fd3ff` (ice-blue luminescent glow)
  - Highlight (`--lime`): `#c8f43a` (chartreuse accent for active chips & focus states)
  - Ink: `#e8eef3`, Muted: `#93a1ad`, Line: `#2b343c`
- **Light Theme**:
  - Base: `#eef2f5` (cool off-white)
  - Surface: `#ffffff` (crisp surface)
  - Primary / Accent (`--a`): `#0a86c0` (deep ice-blue)
  - Highlight (`--lime`): `#c8f43a` (ink: `#1b2500` for WCAG AA readability)
  - Ink: `#0f1419`, Muted: `#55626e`, Line: `#d5dde4`
- **Topic Tokens**:
  - Assigned dynamically via CSS variables (`--c-agents`, `--c-rag`, `--c-tune`, `--c-infra`, etc.) declared per topic in `/config/topics.ts`.
  - The Canvas 2D renderer queries CSS variables from computed styles on theme changes.

### Typography & Polish
- **Space Grotesk** across UI and headings with tight negative tracking on major headings (`-0.035em`).
- Body measure constrained to 65–72 characters with generous line height (`1.65–1.75`).
- Strictly sentence case for all interface labels (no aggressive all-caps).

### Radial View Transition
- Theme toggle uses the CSS View Transitions API (`document.startViewTransition`).
- Radial circular reveal centered at the toggle button click origin: `circle(0px at x y)` expanding to `circle(hypot(...) px at x y)`.
- Graceful instant fallback for browsers lacking View Transitions or when `prefers-reduced-motion` is detected.

---

## 4. Neural Network Map Engine

### Modular Pure TypeScript Engine (`src/lib/network/`)
The canvas engine has zero React imports, allowing isolated testing and predictable lifecycle management:

1. **Graph Builder (`builder.ts`)**:
   - Takes validated topic config and post data.
   - For each topic, constructs a multi-layer feed-forward cluster: `[Input (2), Hidden (3), Posts (N), Output (2)]`.
   - Post nodes are distinct, filled, interactive neurons; intermediate nodes are lightweight, hollow structural neurons.
   - Computes intra-cluster layer connections and inter-cluster bridging synapses as configured in `config/graph.ts`.
2. **Physics & Spring Solver (`physics.ts`)**:
   - Soft floating oscillation per neuron (`sin`/`cos` drift with phase offsets).
   - Elastic cursor repulsion (`F = (radius - dist) * force`) with smooth spring return.
   - Shockwave displacement solver: momentary radial impulse when a post is clicked.
3. **Signal & Synaptic Propagation System (`signals.ts`)**:
   - **Forward Pass**: Ambient pulses cascade through feed-forward layers.
   - **Backpropagation Wave**: Selecting or clicking a post launches a forward cascade to output nodes, immediately triggering an accent-colored gradient wave backpropagating through input nodes.
   - **Bridge Sparks**: Signals crossing inter-cluster synapses trigger micro-sparks at topic thresholds.
   - **Synaptic Memory**: Highlights nodes marked as "read" in `localStorage` with a stable, warm circuit glow.
4. **Camera & Spatial 2.5D (`camera.ts`)**:
   - Multi-plane starfield with depth-based parallax responding to cursor velocity or device orientation.
   - **Cluster Focus Zoom**: Selecting a topic chip smoothly glides and scales the camera to center the chosen cluster, displaying readable post labels directly in canvas.
5. **Renderer (`renderer.ts`)**:
   - DPR capped at 2 to conserve GPU cycles.
   - Automatic pause via `IntersectionObserver` when off-screen and on page visibility loss.
   - Complete reduced-motion mode: static neuron positions, no ambient float, no signal loop, but 100% interactive via hover/click/keyboard.

---

## 5. Development Phases & Roadmap

- **Phase 1: Foundation (Current)**:
  Scaffold Next.js 15, strict TS, Tailwind design tokens, Zod config validation, layout shell with sticky header, Epoch circuit logo, theme toggle with radial transition.
- **Phase 2: Content System**:
  Velite typed collections, MDX components (callout, Shiki code block, diagrams), reading time, RSS, sitemap, 6+ seed posts across all topics.
- **Phase 3: Post Reading Experience**:
  Post layout, key takeaways, scroll-spy sticky TOC, reading progress, series navigation, related posts.
- **Phase 4: Home & Neural Network Map**:
  Complete 2D Canvas engine ported and enhanced, hero section, topic chips, forward/backprop pulses, shockwave ripples, focus zoom, accessible list view fallback.
- **Phase 5: Command Palette & Search**:
  cmdk palette (`Ctrl/Cmd K`), instant client-side search index, topic/post/action keyboard navigation.
- **Phase 6: Immersion Layer**:
  Lazy Three.js 3D depth upgrade, GSAP ScrollTrigger diagram components for flagship articles, micro-interactions.
- **Phase 7: "Ask this Blog" (RAG)**:
  Build-time post embeddings, streaming route handler, citation-linked canvas highlights, safety guardrails.
- **Phase 8: Polish & Ship**:
  Lighthouse 90+ audit, structured metadata/OpenGraph, analytics hooks, Vercel deployment configuration.

---

## 6. Definition of Done (DOD) per Phase
1. `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
2. `npm run lint` passes cleanly.
3. `npm run test` passes all unit/integration tests.
4. `npm run build` succeeds.
5. Both themes verified with WCAG AA compliance.
6. `prefers-reduced-motion` verified.
7. Zero hardcoded domain copy in components.
8. Stop and summarize changes before advancing.
