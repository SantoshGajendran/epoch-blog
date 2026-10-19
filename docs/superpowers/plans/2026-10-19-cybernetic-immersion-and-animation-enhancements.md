# Cybernetic Immersion & Animation Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate Epoch from a standard layout to a deeply immersive, cybernetic AI research publication through ambient reactive backgrounds, free 3D drag-to-orbit with wheel zoom, live telemetry HUD bar, 3D perspective card tilt with cursor spotlight glows, and an animated audio micro-visualizer.

**Architecture:** A modular enhancement layer consisting of: (1) GPU-accelerated CSS/SVG ambient reactive background (`CyberBackground`), (2) spherical coordinate orbit dynamics with inertia damping and camera reset in `ThreeNetworkRenderer`, (3) real-time cluster telemetry HUD (`TelemetryBar`), (4) reusable 3D perspective card container (`SpotlightCard`), and (5) audio micro-equalizer (`AudioVisualizer`) driven by Web Audio micro-interaction triggers.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript (strict), Three.js (^0.174.0), GSAP (^3.15.0), Tailwind CSS, Web Audio API, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-19-cybernetic-immersion-and-animation-enhancements-design.md`

## Global Constraints
- **Zero Hardcoded Domain Terms**: All copy, labels, and 3D camera/orbit configurations come strictly from `/config` validated with Zod.
- **Strict TypeScript**: `strict: true`, `noImplicitAny: true`, zero `any`.
- **Performance Budget**: Strict 60fps; DPR capped at 2.0; off-screen loops paused via `IntersectionObserver`; non-blocking CSS transforms.
- **Accessibility & Motion**: Full `prefers-reduced-motion` compliance; screen reader accessibility (`role="status"`, `aria-live="off"`, visible focus rings).
- **Sentence Case**: All user-facing UI labels must follow sentence case.

---

### Task 1: Configuration Schema Extensions, Audio Visualizer & Micro-Ticks

**Files:**
- Modify: `config/schemas/graph.ts`
- Modify: `config/graph.ts`
- Modify: `config/schemas/site.ts`
- Modify: `config/site.ts`
- Modify: `src/lib/audio/sound-effects.ts`
- Modify: `src/lib/audio/sound-provider.tsx`
- Create: `src/components/layout/audio-visualizer.tsx`
- Modify: `src/components/layout/header.tsx`
- Test: `tests/config-cybernetic.test.ts`
- Test: `tests/audio-visualizer.test.tsx`

**Interfaces:**
- Consumes: `siteConfig.ui`, `useSound()`, `Volume2`/`VolumeX`.
- Produces:
  - `siteConfig.ui.resetCameraLabel`: string
  - `siteConfig.ui.telemetryClusterOnlineLabel`: string
  - `siteConfig.ui.telemetryNodesLabel`: string
  - `siteConfig.ui.telemetryPostsLabel`: string
  - `siteConfig.ui.telemetrySignalsLabel`: string
  - `siteConfig.ui.telemetryInferenceLabel`: string
  - `siteConfig.ui.telemetrySynthActiveLabel`: string
  - `siteConfig.ui.telemetrySynthMutedLabel`: string
  - `siteConfig.ui.audioVisualizerAriaLabel`: string
  - `graphConfig.three.orbitDamping`: number
  - `graphConfig.three.minDistanceRatio`: number
  - `graphConfig.three.maxDistanceRatio`: number
  - `playHoverTick(): void`
  - `<AudioVisualizer />`: React.FC

- [ ] **Step 1: Write failing tests for cybernetic config schemas and audio visualizer**

```typescript
// tests/config-cybernetic.test.ts
import { describe, it, expect } from "vitest";
import { siteConfig, graphConfig } from "@config/index";

describe("Cybernetic Configuration Extensions", () => {
  it("validates 3D orbit and zoom configuration settings", () => {
    expect(graphConfig.three.orbitDamping).toBeGreaterThan(0);
    expect(graphConfig.three.minDistanceRatio).toBeLessThan(1);
    expect(graphConfig.three.maxDistanceRatio).toBeGreaterThan(1);
  });

  it("validates telemetry and visualizer UI labels in sentence case", () => {
    expect(siteConfig.ui.resetCameraLabel).toBe("Reset camera");
    expect(siteConfig.ui.telemetryClusterOnlineLabel).toBe("Cluster: online");
    expect(siteConfig.ui.telemetryNodesLabel).toBe("Nodes");
    expect(siteConfig.ui.telemetryPostsLabel).toBe("Posts");
    expect(siteConfig.ui.telemetrySignalsLabel).toBe("Signals");
    expect(siteConfig.ui.telemetryInferenceLabel).toBe("Inference");
    expect(siteConfig.ui.telemetrySynthActiveLabel).toBe("Synth: active");
    expect(siteConfig.ui.telemetrySynthMutedLabel).toBe("Muted");
    expect(siteConfig.ui.audioVisualizerAriaLabel).toBe("Audio frequency visualizer");
  });
});
```

```typescript
// tests/audio-visualizer.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AudioVisualizer } from "@/components/layout/audio-visualizer";
import { SoundProvider } from "@/lib/audio/sound-provider";

describe("AudioVisualizer Component", () => {
  it("renders 5 visualizer equalizer bars with accessible aria-label", () => {
    render(
      <SoundProvider>
        <AudioVisualizer />
      </SoundProvider>
    );

    const visualizer = screen.getByLabelText(/audio frequency visualizer/i);
    expect(visualizer).toBeInTheDocument();
    expect(visualizer.children.length).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**
Run: `npm run test -- tests/config-cybernetic.test.ts tests/audio-visualizer.test.tsx`
Expected: FAIL with schema missing keys and component not found.

- [ ] **Step 3: Implement config extensions, audio hover tick, and `<AudioVisualizer>`**
Update `config/schemas/graph.ts`, `config/graph.ts`, `config/schemas/site.ts`, `config/site.ts`.
Add `playHoverTick` with throttled playback in `src/lib/audio/sound-effects.ts`.
Create `src/components/layout/audio-visualizer.tsx`.
Update `src/components/layout/header.tsx` to mount `<AudioVisualizer />` beside the sound toggle.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npm run test -- tests/config-cybernetic.test.ts tests/audio-visualizer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit changes**
`git add config/ src/lib/audio/ src/components/layout/ tests/config-cybernetic.test.ts tests/audio-visualizer.test.tsx`
`git commit -m "feat(audio): add cybernetic config schemas, audio visualizer, and hover micro-tick"`

---

### Task 2: Ambient Reactive Background (`<CyberBackground>`)

**Files:**
- Create: `src/components/ambient/cyber-background.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/cyber-background.test.tsx`

**Interfaces:**
- Consumes: None.
- Produces: `<CyberBackground />`: React.FC

- [ ] **Step 1: Write failing test for `<CyberBackground>`**

```typescript
// tests/cyber-background.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CyberBackground } from "@/components/ambient/cyber-background";

describe("CyberBackground Component", () => {
  it("renders fixed background container with aria-hidden true", () => {
    const { container } = render(<CyberBackground />);
    const bg = container.firstChild as HTMLElement;
    expect(bg).toHaveAttribute("aria-hidden", "true");
    expect(bg.className).toContain("fixed");
    expect(bg.className).toContain("pointer-events-none");
  });
});
```

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- tests/cyber-background.test.tsx`
Expected: FAIL with component missing.

- [ ] **Step 3: Implement `src/components/ambient/cyber-background.tsx`**
- Mount fixed, full-viewport pointer-events-none container (`fixed inset-0 pointer-events-none -z-10 overflow-hidden`).
- Render SVG dot-matrix grid with radial cursor mask.
- Multi-stop Glacier Circuit ambient aurora glows with soft blur.
- Pointer tracking updating CSS variables `--glow-x` and `--glow-y` using requestAnimationFrame.
- Disable pointer tracking and animations when `prefers-reduced-motion: reduce` is active.
- Mount `<CyberBackground />` in `src/app/page.tsx`.

- [ ] **Step 4: Run tests to verify pass**
Run: `npm run test -- tests/cyber-background.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit changes**
`git add src/components/ambient/cyber-background.tsx src/app/page.tsx tests/cyber-background.test.tsx`
`git commit -m "feat(ui): implement ambient reactive cyber-background with aurora glow"`

---

### Task 3: 3D Perspective Card Tilt & Cursor Spotlight Glow (`<SpotlightCard>`)

**Files:**
- Create: `src/components/ui/spotlight-card.tsx`
- Modify: `src/components/network/post-preview-card.tsx`
- Modify: `src/components/network/post-list-view.tsx`
- Test: `tests/spotlight-card.test.tsx`

**Interfaces:**
- Consumes: `useOptionalSound()`.
- Produces:
  ```typescript
  export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    glowColor?: string;
    maxTilt?: number;
    className?: string;
  }
  ```

- [ ] **Step 1: Write failing test for `<SpotlightCard>`**

```typescript
// tests/spotlight-card.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpotlightCard } from "@/components/ui/spotlight-card";

describe("SpotlightCard Component", () => {
  it("renders children cleanly", () => {
    render(
      <SpotlightCard>
        <span data-testid="card-child">Test Content</span>
      </SpotlightCard>
    );
    expect(screen.getByTestId("card-child")).toHaveTextContent("Test Content");
  });

  it("updates mouse coordinates on pointer move", () => {
    const { container } = render(
      <SpotlightCard>
        <span>Card</span>
      </SpotlightCard>
    );
    const card = container.firstChild as HTMLElement;
    fireEvent.pointerMove(card, { clientX: 50, clientY: 50 });
    // Card remains mounted without error
    expect(card).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- tests/spotlight-card.test.tsx`
Expected: FAIL with component missing.

- [ ] **Step 3: Implement `src/components/ui/spotlight-card.tsx`**
- Interactive container computing normalized offset $(nx, ny)$ from card center.
- Dynamic 3D perspective rotation (`perspective(1000px) rotateX(...) rotateY(...)`) clamped to `maxTilt` ($6^\circ$).
- Cursor spotlight glow overlay with moving radial gradient.
- Seamless spring return on `onPointerLeave`.
- Reduced-motion bypass disabling 3D transforms.
- Wrap `<PostPreviewCard>` and `<PostListView>` items with `<SpotlightCard>`.

- [ ] **Step 4: Run tests to verify pass**
Run: `npm run test -- tests/spotlight-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit changes**
`git add src/components/ui/spotlight-card.tsx src/components/network/post-preview-card.tsx src/components/network/post-list-view.tsx tests/spotlight-card.test.tsx`
`git commit -m "feat(ui): implement 3D perspective card tilt and cursor spotlight glow"`

---

### Task 4: Live Cybernetic Telemetry HUD Bar (`<TelemetryBar>`)

**Files:**
- Create: `src/components/network/telemetry-bar.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/telemetry-bar.test.tsx`

**Interfaces:**
- Consumes: `NetworkGraph`, `siteConfig.ui`, `useSound()`.
- Produces:
  ```typescript
  export interface TelemetryBarProps {
    totalNeurons: number;
    postNeurons: number;
    signalCount: number;
    dimensionMode: "2d" | "3d";
    className?: string;
  }
  ```

- [ ] **Step 1: Write failing test for `<TelemetryBar>`**

```typescript
// tests/telemetry-bar.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TelemetryBar } from "@/components/network/telemetry-bar";
import { SoundProvider } from "@/lib/audio/sound-provider";

describe("TelemetryBar Component", () => {
  it("renders live cybernetic status readouts", () => {
    render(
      <SoundProvider>
        <TelemetryBar
          totalNeurons={18}
          postNeurons={6}
          signalCount={4}
          dimensionMode="3d"
        />
      </SoundProvider>
    );

    expect(screen.getByText(/cluster: online/i)).toBeInTheDocument();
    expect(screen.getByText(/18/i)).toBeInTheDocument();
    expect(screen.getByText(/6 posts/i)).toBeInTheDocument();
    expect(screen.getByText(/3d spatial/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- tests/telemetry-bar.test.tsx`
Expected: FAIL with component missing.

- [ ] **Step 3: Implement `src/components/network/telemetry-bar.tsx`**
- Glassmorphic HUD status strip with monospace layout.
- Animated cluster status beacon (`● CLUSTER: ONLINE`).
- Real-time node and post metrics.
- Signal frequency computation in Hz.
- Dynamic inference latency ticker with smooth micro-fluctuations.
- Dimension and sound status badges.
- Semantic `role="status"` and `aria-live="off"`.
- Mount in `src/app/page.tsx` above the stage showcase.

- [ ] **Step 4: Run tests to verify pass**
Run: `npm run test -- tests/telemetry-bar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit changes**
`git add src/components/network/telemetry-bar.tsx src/app/page.tsx tests/telemetry-bar.test.tsx`
`git commit -m "feat(network): implement live cybernetic telemetry HUD bar"`

---

### Task 5: 3D Stage Free Spherical Orbit, Smooth Wheel Zoom & Camera Reset View

**Files:**
- Modify: `src/lib/network/three-renderer.ts`
- Modify: `src/components/network/network-map-3d.tsx`
- Test: `tests/three-orbit.test.ts`
- Modify: `tests/network-3d.test.tsx`

**Interfaces:**
- Consumes: `graphConfig.three`, `siteConfig.ui.resetCameraLabel`.
- Produces:
  - `renderer.startOrbit(clientX: number, clientY: number): void`
  - `renderer.updateOrbit(clientX: number, clientY: number): void`
  - `renderer.endOrbit(): boolean` (returns true if it was a drag, false if a click)
  - `renderer.handleZoom(deltaY: number): void`
  - `renderer.resetCamera(): void`

- [ ] **Step 1: Write failing tests for 3D orbit mechanics, zoom bounds, and reset camera**

```typescript
// tests/three-orbit.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import { ThreeNetworkRenderer } from "@/lib/network/three-renderer";
import { graphConfig, topicsConfig } from "@config/index";
import { buildNetworkGraph } from "@/lib/network/builder";

describe("ThreeNetworkRenderer Orbit & Zoom", () => {
  let canvas: HTMLCanvasElement;
  let renderer: ThreeNetworkRenderer;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    renderer = new ThreeNetworkRenderer(canvas, graphConfig);
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, []);
    renderer.setGraph(graph);
    renderer.resize(800, 600, 1);
  });

  afterEach(() => {
    renderer.dispose();
  });

  it("distinguishes drag orbit from click based on distance threshold", () => {
    renderer.startOrbit(100, 100);
    // Move 2px (below 5px threshold)
    renderer.updateOrbit(101, 101);
    const wasDrag = renderer.endOrbit();
    expect(wasDrag).toBe(false);

    // Move 20px (above 5px threshold)
    renderer.startOrbit(100, 100);
    renderer.updateOrbit(120, 120);
    const wasDrag2 = renderer.endOrbit();
    expect(wasDrag2).toBe(true);
  });

  it("clamps wheel zoom distance within min and max distance ratios", () => {
    const baseDist = renderer.getBaseDistance();
    // Zoom in drastically
    for (let i = 0; i < 50; i++) renderer.handleZoom(-100);
    expect(renderer.getCameraDistance()).toBeGreaterThanOrEqual(
      baseDist * graphConfig.three.minDistanceRatio - 1
    );

    // Zoom out drastically
    for (let i = 0; i < 50; i++) renderer.handleZoom(100);
    expect(renderer.getCameraDistance()).toBeLessThanOrEqual(
      baseDist * graphConfig.three.maxDistanceRatio + 1
    );
  });

  it("resets camera coordinates to default on resetCamera()", () => {
    renderer.startOrbit(100, 100);
    renderer.updateOrbit(300, 300);
    renderer.endOrbit();
    renderer.resetCamera();
    expect(renderer.isCameraResetting()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- tests/three-orbit.test.ts`
Expected: FAIL with orbit methods undefined on `ThreeNetworkRenderer`.

- [ ] **Step 3: Implement spherical orbit, zoom, and reset in `ThreeNetworkRenderer` & `<NetworkMap3D>`**
- Add spherical orbit $(\theta, \phi, \text{distance})$ state to `ThreeNetworkRenderer`.
- Implement `startOrbit`, `updateOrbit`, `endOrbit` with inertia damping ($0.05$) and $5\text{px}$ drag threshold.
- Implement `handleZoom` clamping between `minDistanceRatio` and `maxDistanceRatio`.
- Implement `resetCamera()` with smooth lerp back to base coordinates.
- Update `<NetworkMap3D>` with pointer drag handlers, wheel zoom listener, and top-right "Reset view" HUD button using `siteConfig.ui.resetCameraLabel`.

- [ ] **Step 4: Run tests to verify pass**
Run: `npm run test -- tests/three-orbit.test.ts tests/network-3d.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit changes**
`git add src/lib/network/three-renderer.ts src/components/network/network-map-3d.tsx tests/three-orbit.test.ts tests/network-3d.test.tsx`
`git commit -m "feat(network): implement 3D spherical orbit controls, wheel zoom, and reset camera HUD"`

---

### Task 6: Whole-Phase Acceptance Verification & Polish

**Files:**
- Modify any files needing visual polish or accessibility refinements.

- [ ] **Step 1: Run TypeScript typecheck**
Run: `npm run typecheck`
Expected: Exit code 0 (zero errors).

- [ ] **Step 2: Run linter**
Run: `npm run lint`
Expected: 0 warnings, 0 errors.

- [ ] **Step 3: Run full Vitest test suite**
Run: `npm run test`
Expected: All test files passing.

- [ ] **Step 4: Run production build**
Run: `npm run build`
Expected: Velite strict build succeeds, Next.js generates static pages (12/12).

- [ ] **Step 5: Verify zero hardcoded domain terms across all new files**
Run: audit check verifying all labels come from `siteConfig.ui` and `graphConfig.three`.

- [ ] **Step 6: Verify reduced motion and mobile accessibility**
Ensure all animations, 3D tilts, and orbit damping cleanly degrade when `prefers-reduced-motion` is active.

- [ ] **Step 7: Final milestone commit**
`git commit -m "milestone: complete cybernetic immersion and animation enhancements acceptance verification"`
