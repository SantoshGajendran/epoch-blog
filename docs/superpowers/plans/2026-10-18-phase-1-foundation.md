# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js 15 project with strict TypeScript, implement the "Glacier Circuit" token system, build the fail-loud Zod configuration engine (`/config`), and create the accessible layout shell with a radial-reveal theme transition.

**Architecture:** A Next.js 15 App Router foundation built with strict type safety and zero hardcoded domain terms. A centralized `/config` system validates all site copy, topic metadata, and graph parameters at build time with Zod. The UI layer uses Tailwind CSS with CSS variable tokens for the "Glacier Circuit" design system, Space Grotesk typography, and a custom View Transitions API radial theme toggle with instant fallback.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS, Zod, Vitest, Lucide React, Space Grotesk (`next/font/google`).

**Spec:** [docs/superpowers/specs/2026-10-18-epoch-design.md](file:///d:/Santosh/Development/blog/docs/superpowers/specs/2026-10-18-epoch-design.md)

## Global Constraints

- NO hardcoded domain terms in code: Site name, tagline, topic names, topic colors, cluster positions, nav links, social links, and all UI copy live in config files (`/config/*.ts` validated with Zod).
- TypeScript strict mode: `strict: true`, `noImplicitAny: true`, no `any`, no unused locals/parameters.
- Sentence case for all UI copy.
- WCAG AA contrast in both light and dark themes; visible focus rings (`:focus-visible`).
- `prefers-reduced-motion` respected everywhere.

---

### Task 1: Project Scaffolding & Strict Toolchain Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `.eslintrc.json`
- Create: `.gitignore`

**Interfaces:**
- Produces: Working development, build, typecheck, lint, and test scripts in `package.json`.

- [ ] **Step 1: Create package.json with exact dependencies**

```json
{
  "name": "epoch-blog",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "next": "15.1.7",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.0.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.20.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@types/node": "^22.13.4",
    "@types/react": "^19.0.9",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.20.1",
    "eslint-config-next": "15.1.7",
    "jsdom": "^26.0.0",
    "postcss": "^8.5.2",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: Dependencies installed cleanly.

- [ ] **Step 3: Create strict tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@config/*": ["./config/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create Next, PostCSS, Tailwind, Vitest, and ESLint configurations**

Create `next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

Create `postcss.config.mjs`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Create `tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surf: "var(--surf)",
        ink: "var(--ink)",
        mut: "var(--mut)",
        line: "var(--line)",
        primary: "var(--a)",
        lime: "var(--lime)",
        limeink: "var(--limeink)",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@config": path.resolve(__dirname, "./config"),
    },
  },
});
```

Create `.eslintrc.json`:
```json
{
  "extends": ["next/core-web-vitals"]
}
```

Create `.gitignore`:
```
node_modules
.next
out
build
dist
*.log
.DS_Store
coverage
```

- [ ] **Step 5: Verify toolchain readiness**

Run: `npm run typecheck`
Expected: Passes with no errors (or clean check).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs tailwind.config.ts vitest.config.ts .eslintrc.json .gitignore
git commit -m "chore: scaffold Next.js 15 project with strict TypeScript and toolchain"
```

---

### Task 2: Strict Zod-Validated Configuration System (`/config`)

**Files:**
- Create: `config/schemas/site.ts`
- Create: `config/schemas/nav.ts`
- Create: `config/schemas/topics.ts`
- Create: `config/schemas/graph.ts`
- Create: `config/site.ts`
- Create: `config/nav.ts`
- Create: `config/topics.ts`
- Create: `config/graph.ts`
- Create: `config/index.ts`
- Test: `tests/config.test.ts`

**Interfaces:**
- Produces: `siteConfig`, `navConfig`, `topicsConfig`, `graphConfig` exported from `config/index.ts` with validated inferred types.

- [ ] **Step 1: Write failing test for config validation**

Create `tests/config.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { siteConfig, navConfig, topicsConfig, graphConfig } from "@config/index";
import { siteConfigSchema } from "@config/schemas/site";
import { topicsConfigSchema } from "@config/schemas/topics";

describe("Configuration System", () => {
  it("exports valid site config matching schema", () => {
    expect(siteConfig.name).toBe("Epoch");
    expect(siteConfig.tagline).toBe("One more pass at understanding AI.");
    expect(() => siteConfigSchema.parse(siteConfig)).not.toThrow();
  });

  it("exports valid topics config with all required topics", () => {
    expect(topicsConfig.topics.length).toBeGreaterThanOrEqual(4);
    const topicIds = topicsConfig.topics.map((t) => t.id);
    expect(topicIds).toContain("agents");
    expect(topicIds).toContain("rag");
    expect(topicIds).toContain("tune");
    expect(topicIds).toContain("infra");
  });

  it("fails loud when topic configuration has missing or invalid fields", () => {
    const invalidTopics = {
      topics: [
        {
          id: "invalid",
          label: "Invalid",
          // missing colorToken and clusterPosition
        },
      ],
    };
    expect(() => topicsConfigSchema.parse(invalidTopics)).toThrow();
  });

  it("exports valid graph config with layers and physics", () => {
    expect(graphConfig.physics.damping).toBeGreaterThan(0);
    expect(graphConfig.signals.maxConcurrent).toBeGreaterThan(0);
    expect(graphConfig.clusterLayers).toEqual([2, 3, 0, 2]); // 0 represents dynamic posts layer
    expect(graphConfig.postsLayerIndex).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL ("Cannot find module '@config/index'")

- [ ] **Step 3: Implement Zod schemas and configuration values**

Create `config/schemas/site.ts`:
```ts
import { z } from "zod";

export const siteConfigSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  url: z.string().url(),
  author: z.object({
    name: z.string().min(1),
    bio: z.string().min(1),
    avatar: z.string().optional(),
    twitter: z.string().optional(),
    github: z.string().optional(),
  }),
  ui: z.object({
    searchPlaceholder: z.string(),
    searchButtonLabel: z.string(),
    searchAriaLabel: z.string(),
    themeToggleAriaLabel: z.string(),
    allTopicsLabel: z.string(),
    mapViewLabel: z.string(),
    listViewLabel: z.string(),
    prototypeHint: z.string(),
    readPostLabel: z.string(),
    minReadSuffix: z.string(),
    noSearchResultsLabel: z.string(),
  }),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
```

Create `config/schemas/nav.ts`:
```ts
import { z } from "zod";

export const navItemSchema = z.object({
  label: z.string().min(1),
  href: z.string(),
  external: z.boolean().optional(),
});

export const navConfigSchema = z.object({
  mainNav: z.array(navItemSchema),
});

export type NavConfig = z.infer<typeof navConfigSchema>;
```

Create `config/schemas/topics.ts`:
```ts
import { z } from "zod";

export const topicSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  colorToken: z.string().regex(/^--[a-z0-9-]+$/),
  lightColor: z.string(),
  darkColor: z.string(),
  clusterPosition: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  description: z.string(),
});

export const topicsConfigSchema = z.object({
  topics: z.array(topicSchema),
});

export type Topic = z.infer<typeof topicSchema>;
export type TopicsConfig = z.infer<typeof topicsConfigSchema>;
```

Create `config/schemas/graph.ts`:
```ts
import { z } from "zod";

export const interTopicLinkSchema = z.object({
  sourceTopic: z.string(),
  targetTopic: z.string(),
  sourceLayer: z.number(),
  targetLayer: z.number(),
  mode: z.enum(["all-to-all", "one-to-one"]),
});

export const graphConfigSchema = z.object({
  clusterLayers: z.array(z.number()),
  postsLayerIndex: z.number(),
  interTopicLinks: z.array(interTopicLinkSchema),
  signals: z.object({
    spawnIntervalMs: z.number().positive(),
    spawnProbability: z.number().min(0).max(1),
    speedRange: z.tuple([z.number().positive(), z.number().positive()]),
    trailLength: z.number().int().positive(),
    maxDepth: z.number().int().positive(),
    maxConcurrent: z.number().int().positive(),
    fireBurstIntervalMs: z.number().positive(),
  }),
  physics: z.object({
    spring: z.number().positive(),
    damping: z.number().positive(),
    cursorRepulsionRadius: z.number().positive(),
    cursorRepulsionForce: z.number().positive(),
  }),
  animation: z.object({
    introDurationMs: z.number().positive(),
    clusterStaggerMs: z.number().positive(),
    layerStaggerMs: z.number().positive(),
    rowStaggerMs: z.number().positive(),
  }),
});

export type GraphConfig = z.infer<typeof graphConfigSchema>;
```

Create `config/site.ts`:
```ts
import { siteConfigSchema, type SiteConfig } from "./schemas/site";

export const siteConfig: SiteConfig = siteConfigSchema.parse({
  name: "Epoch",
  tagline: "One more pass at understanding AI.",
  description: "Build logs, deep dives, and architectural patterns on autonomous agents, retrieval, fine-tuning, and scalable inference infrastructure.",
  url: "https://epoch.dev",
  author: {
    name: "AI Engineer",
    bio: "Passionate about autonomous systems and applied AI.",
    github: "https://github.com",
    twitter: "https://twitter.com",
  },
  ui: {
    searchPlaceholder: "Search posts, topics, actions",
    searchButtonLabel: "Search",
    searchAriaLabel: "Open search dialog",
    themeToggleAriaLabel: "Toggle light and dark theme",
    allTopicsLabel: "All topics",
    mapViewLabel: "Map",
    listViewLabel: "List",
    prototypeHint: "Press Ctrl K (or Cmd K) to search.",
    readPostLabel: "Read the post",
    minReadSuffix: "min read",
    noSearchResultsLabel: "No matches found.",
  },
});
```

Create `config/nav.ts`:
```ts
import { navConfigSchema, type NavConfig } from "./schemas/nav";

export const navConfig: NavConfig = navConfigSchema.parse({
  mainNav: [],
});
```

Create `config/topics.ts`:
```ts
import { topicsConfigSchema, type TopicsConfig } from "./schemas/topics";

export const topicsConfig: TopicsConfig = topicsConfigSchema.parse({
  topics: [
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
    {
      id: "tune",
      label: "Fine-tuning",
      colorToken: "--c-tune",
      lightColor: "#4a5fe0",
      darkColor: "#8ea2ff",
      clusterPosition: { x: 0.25, y: 0.74 },
      description: "QLoRA datasets, loss optimization, quantization, and local fine-tunes.",
    },
    {
      id: "infra",
      label: "Infrastructure",
      colorToken: "--c-infra",
      lightColor: "#0e9f73",
      darkColor: "#5ff0c0",
      clusterPosition: { x: 0.75, y: 0.74 },
      description: "Self-hosting models, gateway failover routing, and tracing pipelines.",
    },
  ],
});
```

Create `config/graph.ts`:
```ts
import { graphConfigSchema, type GraphConfig } from "./schemas/graph";

export const graphConfig: GraphConfig = graphConfigSchema.parse({
  clusterLayers: [2, 3, 0, 2], // 0 indicates dynamic count based on posts
  postsLayerIndex: 2,
  interTopicLinks: [
    {
      sourceTopic: "agents",
      targetTopic: "rag",
      sourceLayer: 3,
      targetLayer: 0,
      mode: "all-to-all",
    },
    {
      sourceTopic: "tune",
      targetTopic: "infra",
      sourceLayer: 3,
      targetLayer: 0,
      mode: "all-to-all",
    },
    {
      sourceTopic: "agents",
      targetTopic: "tune",
      sourceLayer: 1,
      targetLayer: 1,
      mode: "one-to-one",
    },
    {
      sourceTopic: "rag",
      targetTopic: "infra",
      sourceLayer: 1,
      targetLayer: 1,
      mode: "one-to-one",
    },
  ],
  signals: {
    spawnIntervalMs: 16,
    spawnProbability: 0.06,
    speedRange: [0.02, 0.032],
    trailLength: 4,
    maxDepth: 9,
    maxConcurrent: 40,
    fireBurstIntervalMs: 2600,
  },
  physics: {
    spring: 0.04,
    damping: 0.78,
    cursorRepulsionRadius: 90,
    cursorRepulsionForce: 0.01,
  },
  animation: {
    introDurationMs: 600,
    clusterStaggerMs: 160,
    layerStaggerMs: 240,
    rowStaggerMs: 70,
  },
});
```

Create `config/index.ts`:
```ts
export * from "./site";
export * from "./nav";
export * from "./topics";
export * from "./graph";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (all config tests passing).

- [ ] **Step 5: Commit**

```bash
git add config/ tests/config.test.ts
git commit -m "feat: implement Zod-validated configuration system"
```

---

### Task 3: Design System Tokens & Global Styles ("Glacier Circuit")

**Files:**
- Create: `src/app/globals.css`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/kbd.tsx`

**Interfaces:**
- Produces: Tailwind utilities and CSS variables for theme switching (`data-theme="dark"` / `data-theme="light"`).
- Produces: `cn(...inputs)` utility function.
- Produces: `<Button />` and `<Kbd />` accessible UI components.

- [ ] **Step 1: Create src/lib/utils.ts**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Create src/app/globals.css with design tokens**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #eef2f5;
  --surf: #ffffff;
  --ink: #0f1419;
  --mut: #55626e;
  --line: #d5dde4;
  --lime: #c8f43a;
  --limeink: #1b2500;
  --a: #0a86c0;

  /* Topic tokens (Light) */
  --c-agents: #0a86c0;
  --c-rag: #6c9400;
  --c-tune: #4a5fe0;
  --c-infra: #0e9f73;

  color-scheme: light;
}

:root[data-theme="dark"] {
  --bg: #14181c;
  --surf: #1c2227;
  --ink: #e8eef3;
  --mut: #93a1ad;
  --line: #2b343c;
  --lime: #c8f43a;
  --limeink: #1b2500;
  --a: #6fd3ff;

  /* Topic tokens (Dark) */
  --c-agents: #6fd3ff;
  --c-rag: #c8f43a;
  --c-tune: #8ea2ff;
  --c-infra: #5ff0c0;

  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #14181c;
    --surf: #1c2227;
    --ink: #e8eef3;
    --mut: #93a1ad;
    --line: #2b343c;
    --lime: #c8f43a;
    --limeink: #1b2500;
    --a: #6fd3ff;

    --c-agents: #6fd3ff;
    --c-rag: #c8f43a;
    --c-tune: #8ea2ff;
    --c-infra: #5ff0c0;

    color-scheme: dark;
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: var(--bg);
  color: var(--ink);
  font-family: var(--font-space-grotesk), system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

/* View Transition Styles for Radial Reveal */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
::view-transition-old(root) {
  z-index: 0;
}
::view-transition-new(root) {
  z-index: 1;
}

/* Accessible visible focus */
:focus-visible {
  outline: 2px solid var(--a);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Create UI primitives Button and Kbd**

Create `src/components/ui/button.tsx`:
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-surf border border-line text-ink hover:border-primary shadow-sm",
          variant === "outline" && "border border-line bg-transparent hover:bg-surf text-ink",
          variant === "ghost" && "hover:bg-surf text-ink",
          size === "default" && "h-9 px-3.5 py-1.5 gap-2",
          size === "sm" && "h-8 px-2.5 text-xs gap-1.5",
          size === "icon" && "h-9 w-9",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
```

Create `src/components/ui/kbd.tsx`:
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "rounded-md border border-line px-1.5 py-0.5 text-xs text-mut font-sans font-normal",
        className
      )}
    >
      {children}
    </kbd>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/lib/utils.ts src/components/ui/
git commit -m "feat: implement Glacier Circuit design system tokens and UI primitives"
```

---

### Task 4: Theme System with Radial View Transitions

**Files:**
- Create: `src/lib/theme/theme-provider.tsx`
- Create: `src/lib/theme/use-theme.ts`
- Test: `tests/theme.test.ts`

**Interfaces:**
- Produces: `ThemeProvider` component wrapping the App Router.
- Produces: `useTheme()` hook exposing `{ theme, resolvedTheme, setTheme, toggleTheme }`.

- [ ] **Step 1: Write failing test for theme hook behavior**

Create `tests/theme.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Theme System Logic", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
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
});
```

- [ ] **Step 2: Run test to verify it passes baseline**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 3: Implement ThemeProvider and useTheme with View Transitions API**

Create `src/lib/theme/use-theme.ts`:
```ts
import { createContext, useContext } from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme, coordinates?: { x: number; y: number }) => void;
  toggleTheme: (event?: React.MouseEvent) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
```

Create `src/lib/theme/theme-provider.tsx`:
```tsx
"use client";

import * as React from "react";
import { Theme, ThemeContext } from "./use-theme";

const STORAGE_KEY = "epoch-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("dark");

  const getSystemTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && ["light", "dark", "system"].includes(stored)) {
        setThemeState(stored);
      }
    } catch {
      // ignore local storage errors
    }
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    root.setAttribute("data-theme", resolved);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (theme === "system") {
        const sys = getSystemTheme();
        setResolvedTheme(sys);
        root.setAttribute("data-theme", sys);
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = React.useCallback(
    (nextTheme: Theme, coordinates?: { x: number; y: number }) => {
      const root = document.documentElement;
      const targetResolved = nextTheme === "system" ? getSystemTheme() : nextTheme;

      const applyTheme = () => {
        setThemeState(nextTheme);
        setResolvedTheme(targetResolved);
        root.setAttribute("data-theme", targetResolved);
        try {
          localStorage.setItem(STORAGE_KEY, nextTheme);
        } catch {
          // ignore storage error
        }
      };

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = document as any;

      if (!doc.startViewTransition || prefersReducedMotion || !coordinates) {
        applyTheme();
        return;
      }

      const { x, y } = coordinates;
      const transition = doc.startViewTransition(applyTheme);

      transition.ready
        .then(() => {
          const maxRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
          );

          root.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${maxRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 650,
              easing: "cubic-bezier(0.65, 0, 0.35, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {
          // fallback if transition fails
        });
    },
    []
  );

  const toggleTheme = React.useCallback(
    (event?: React.MouseEvent) => {
      const next: Theme = resolvedTheme === "dark" ? "light" : "dark";
      let coordinates: { x: number; y: number } | undefined;
      if (event) {
        coordinates = { x: event.clientX, y: event.clientY };
      }
      setTheme(next, coordinates);
    },
    [resolvedTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/ tests/theme.test.ts
git commit -m "feat: implement theme provider with radial view transitions"
```

---

### Task 5: Layout Shell & Header Component

**Files:**
- Create: `src/components/layout/logo.tsx`
- Create: `src/components/layout/theme-toggle.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Interfaces:**
- Produces: Header navigation with accessible logo, search trigger with `Ctrl K` kbd shortcut, and theme toggle.
- Produces: Clean root layout loading Space Grotesk font via `next/font/google`.

- [ ] **Step 1: Create Logo component matching the prototype circuit concentric ring**

Create `src/components/layout/logo.tsx`:
```tsx
import Link from "next/link";
import { siteConfig } from "@config/index";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 font-bold text-lg tracking-tight text-ink focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span
        aria-hidden="true"
        className="relative block h-3.5 w-3.5 rounded-full border-2 border-primary"
      >
        <span className="absolute inset-[2px] rounded-full bg-lime" />
      </span>
      <span>{siteConfig.name}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Create ThemeToggle button**

Create `src/components/layout/theme-toggle.tsx`:
```tsx
"use client";

import { useTheme } from "@/lib/theme/use-theme";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@config/index";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="default"
      onClick={(e) => toggleTheme(e)}
      aria-label={siteConfig.ui.themeToggleAriaLabel}
      className="cursor-pointer font-sans"
    >
      {resolvedTheme === "dark" ? (
        <>
          <Sun className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Dark</span>
        </>
      )}
    </Button>
  );
}
```

- [ ] **Step 3: Create Header component**

Create `src/components/layout/header.tsx`:
```tsx
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { siteConfig } from "@config/index";
import { Search } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Logo />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            aria-label={siteConfig.ui.searchAriaLabel}
            className="cursor-pointer gap-2"
          >
            <Search className="h-3.5 w-3.5 text-mut" aria-hidden="true" />
            <span>{siteConfig.ui.searchButtonLabel}</span>
            <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create Root Layout with Space Grotesk**

Create `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { Header } from "@/components/layout/header";
import { siteConfig } from "@config/index";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-bg text-ink min-h-screen flex flex-col">
        <ThemeProvider>
          <Header />
          <div className="flex-1">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create baseline Home Page reading from config**

Create `src/app/page.tsx`:
```tsx
import { siteConfig } from "@config/index";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <section className="max-w-2xl py-6">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink leading-[1.05]">
          {siteConfig.tagline}
        </h1>
        <p className="mt-4 text-lg text-mut leading-relaxed">
          {siteConfig.description}
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Verify typecheck and tests**

Run: `npm run typecheck && npm run test`
Expected: PASS with 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/ src/app/
git commit -m "feat: create accessible layout shell, header, and home foundation"
```

---

### Task 6: Phase 1 Acceptance Verification (DOD)

**Files:**
- Audit: All files in repository

**Verification Steps:**
- [ ] **Step 1: Run typecheck**
Run: `npm run typecheck`
Expected: Exit code 0, no errors.

- [ ] **Step 2: Run test suite**
Run: `npm run test`
Expected: All tests pass.

- [ ] **Step 3: Run production build**
Run: `npm run build`
Expected: `next build` generates `.next` output cleanly without errors or warnings.

- [ ] **Step 4: Check for hardcoded domain strings**
Verify: Search `src/` to confirm zero hardcoded strings ("Epoch", "One more pass at understanding AI.", topic titles, button labels). All must be read from `@config`.

- [ ] **Step 5: Commit final Phase 1 milestone**
```bash
git commit --allow-empty -m "milestone: complete Phase 1 Foundation acceptance verification"
```
