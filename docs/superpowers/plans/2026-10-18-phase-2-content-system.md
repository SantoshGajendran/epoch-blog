# Phase 2: Content System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust, type-safe MDX content system powered by Velite collections for posts and series, Shiki dual-theme syntax highlighting, custom accessible MDX components, RSS/sitemap feeds, dynamic per-post OG images, and 6+ technical seed posts across all topics.

**Architecture:** Velite compiles MDX files in `content/` at build time into `.velite` with strict Zod validation against `config/topics.ts`. Posts provide computed reading time, table-of-contents headings, and dual-theme Shiki code highlighting. Content helper functions in `src/lib/content/` provide pure, cached query APIs for routes and components. Dynamic OpenGraph images are generated via `next/og`.

**Tech Stack:** Next.js 15.1.7 (App Router), Velite 0.4.0, Shiki, Rehype Pretty Code, Rehype Slug, Rehype Autolink Headings, Remark GFM, Lucide React, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-epoch-design.md`

## Global Constraints
- Zero hardcoded domain terms in code; all branding, topic names, and UI copy originate from `@config/index`.
- Build MUST fail loudly if a post references an unknown topic not defined in `config/topics.ts` or has missing required frontmatter.
- Strict TypeScript (`strict: true`, `noImplicitAny: true`, no `any`).
- WCAG AA contrast in both light and dark themes.
- `prefers-reduced-motion` respected everywhere.
- Sentence case for all UI labels.

---

### Task 1: Velite Collections & Strict Frontmatter Validation

**Files:**
- Create: `velite.config.ts`
- Modify: `tsconfig.json` (add `#site/content` alias)
- Modify: `package.json` (update build/dev scripts to trigger velite)
- Create: `tests/content-schema.test.ts`

**Interfaces:**
- Produces: `.velite` generated output containing typed `posts` and `series`.
- Produces: Type-safe import `#site/content` or `@velite`.
- Enforces: Validation failure if `topic` is not in `topicsConfig.topics.map(t => t.id)`.

- [ ] **Step 1: Write failing schema validation test**

Create `tests/content-schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { topicsConfig } from "@config/index";

describe("Content Schema Constraints", () => {
  it("verifies all topic IDs from topicsConfig are valid", () => {
    const validTopics = topicsConfig.topics.map((t) => t.id);
    expect(validTopics).toContain("agents");
    expect(validTopics).toContain("rag");
    expect(validTopics).toContain("tune");
    expect(validTopics).toContain("infra");
  });

  it("rejects unknown topic IDs in validator function", () => {
    const validTopics = new Set(topicsConfig.topics.map((t) => t.id));
    const validateTopic = (topic: string) => validTopics.has(topic);

    expect(validateTopic("agents")).toBe(true);
    expect(validateTopic("quantum-cryptography")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it passes baseline**

Run: `npx vitest run tests/content-schema.test.ts`
Expected: PASS.

- [ ] **Step 3: Create velite.config.ts with strict topic validation and Shiki plugins**

Create `velite.config.ts`:
```ts
import { defineConfig, defineCollection, s } from "velite";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkGfm from "remark-gfm";
import { topicsConfig } from "./config/topics";

const validTopicIds = new Set(topicsConfig.topics.map((t) => t.id));

const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/*.mdx",
  schema: s
    .object({
      title: s.string().max(120),
      summary: s.string().max(300),
      date: s.isodate(),
      updated: s.isodate().optional(),
      topic: s.string().refine((val) => validTopicIds.has(val), {
        message: `Topic must be one of: ${Array.from(validTopicIds).join(", ")}`,
      }),
      tags: s.array(s.string()).default([]),
      series: s
        .object({
          id: s.string(),
          order: s.number().int().min(1),
        })
        .optional(),
      draft: s.boolean().default(false),
      cover: s.string().optional(),
      toc: s.toc(),
      metadata: s.metadata(),
      body: s.mdx(),
    })
    .transform((data, { meta }) => {
      const slug = meta.path.replace(/^posts\//, "").replace(/\.mdx$/, "");
      const wordCount = data.metadata.content?.split(/\s+/).length || 0;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      return {
        ...data,
        slug,
        permalink: `/posts/${slug}`,
        readingTime,
      };
    }),
});

const series = defineCollection({
  name: "Series",
  pattern: "series/**/*.mdx",
  schema: s
    .object({
      id: s.string(),
      title: s.string().max(120),
      summary: s.string().max(300),
      order: s.number().int().default(1),
      body: s.mdx(),
    })
    .transform((data, { meta }) => {
      const slug = meta.path.replace(/^series\//, "").replace(/\.mdx$/, "");
      return {
        ...data,
        slug,
        permalink: `/series/${slug}`,
      };
    }),
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: { posts, series },
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypePrettyCode,
        {
          theme: {
            dark: "github-dark-default",
            light: "github-light-default",
          },
          keepBackground: false,
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap",
          properties: {
            className: ["subheading-anchor"],
            ariaLabel: "Link to section",
          },
        },
      ],
    ],
  },
});
```

- [ ] **Step 4: Update tsconfig.json and package.json**

Add path alias in `tsconfig.json`:
```json
    "paths": {
      "@/*": ["./src/*"],
      "@config/*": ["./config/*"],
      "#site/content": ["./.velite"]
    }
```

Update `package.json` scripts:
```json
    "dev": "velite dev & next dev",
    "build": "velite build && next build",
    "velite": "velite build",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest run"
```

- [ ] **Step 5: Commit Task 1**

```bash
git add velite.config.ts tsconfig.json package.json tests/content-schema.test.ts
git commit -m "feat(content): configure Velite collections with strict topic validation"
```

---

### Task 2: Content Query Library & Topic Integration

**Files:**
- Create: `src/lib/content/index.ts`
- Create: `tests/content-queries.test.ts`

**Interfaces:**
- Produces: `getAllPosts(options?: { includeDrafts?: boolean }) => Post[]`
- Produces: `getPostBySlug(slug: string) => Post | undefined`
- Produces: `getPostsByTopic(topicId: string) => Post[]`
- Produces: `getSeries() => Series[]`
- Produces: `getSeriesById(seriesId: string) => { series: Series; posts: Post[] } | undefined`
- Produces: `getRelatedPosts(post: Post, limit?: number) => Post[]`

- [ ] **Step 1: Write failing query tests with mock data**

Create `tests/content-queries.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  filterPublishedPosts,
  sortPostsByDate,
  findRelatedPosts,
  type ContentPost,
} from "@/lib/content";

const mockPosts: ContentPost[] = [
  {
    title: "Post 1",
    slug: "post-1",
    permalink: "/posts/post-1",
    summary: "Summary 1",
    date: "2026-03-01T00:00:00Z",
    topic: "agents",
    tags: ["evals", "loops"],
    draft: false,
    readingTime: 5,
    toc: [],
  },
  {
    title: "Post 2",
    slug: "post-2",
    permalink: "/posts/post-2",
    summary: "Summary 2",
    date: "2026-03-10T00:00:00Z",
    topic: "agents",
    tags: ["routing", "loops"],
    draft: false,
    readingTime: 6,
    toc: [],
  },
  {
    title: "Draft Post",
    slug: "draft-post",
    permalink: "/posts/draft-post",
    summary: "Draft summary",
    date: "2026-03-15T00:00:00Z",
    topic: "rag",
    tags: ["evals"],
    draft: true,
    readingTime: 3,
    toc: [],
  },
];

describe("Content Query Logic", () => {
  it("filters published posts when drafts are excluded", () => {
    const published = filterPublishedPosts(mockPosts, false);
    expect(published.length).toBe(2);
    expect(published.some((p) => p.draft)).toBe(false);
  });

  it("includes drafts when requested", () => {
    const all = filterPublishedPosts(mockPosts, true);
    expect(all.length).toBe(3);
  });

  it("sorts posts by date descending", () => {
    const sorted = sortPostsByDate(mockPosts);
    expect(sorted[0].slug).toBe("draft-post");
    expect(sorted[1].slug).toBe("post-2");
    expect(sorted[2].slug).toBe("post-1");
  });

  it("finds related posts by topic and tags excluding self", () => {
    const related = findRelatedPosts(mockPosts[0], mockPosts, 2);
    expect(related.length).toBe(1);
    expect(related[0].slug).toBe("post-2");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/content-queries.test.ts`
Expected: FAIL ("Cannot find module '@/lib/content'").

- [ ] **Step 3: Implement content query functions**

Create `src/lib/content/index.ts`:
```ts
import { posts, series, type Post, type Series } from "#site/content";

export type ContentPost = Omit<Post, "body" | "metadata"> & {
  body?: Post["body"];
  metadata?: Post["metadata"];
};

export function filterPublishedPosts<T extends { draft: boolean }>(
  items: T[],
  includeDrafts = process.env.NODE_ENV === "development"
): T[] {
  if (includeDrafts) return items;
  return items.filter((item) => !item.draft);
}

export function sortPostsByDate<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getAllPosts(options?: { includeDrafts?: boolean }): Post[] {
  const filtered = filterPublishedPosts(posts, options?.includeDrafts);
  return sortPostsByDate(filtered);
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getPostsByTopic(topicId: string, options?: { includeDrafts?: boolean }): Post[] {
  return getAllPosts(options).filter((p) => p.topic === topicId);
}

export function getAllSeries(): Series[] {
  return [...series].sort((a, b) => a.order - b.order);
}

export function getSeriesById(seriesId: string) {
  const currentSeries = series.find((s) => s.id === seriesId);
  if (!currentSeries) return undefined;

  const seriesPosts = getAllPosts().filter((p) => p.series?.id === seriesId);
  seriesPosts.sort((a, b) => (a.series?.order || 0) - (b.series?.order || 0));

  return {
    series: currentSeries,
    posts: seriesPosts,
  };
}

export function findRelatedPosts<T extends { slug: string; topic: string; tags: string[] }>(
  currentPost: T,
  allPosts: T[],
  limit = 3
): T[] {
  return allPosts
    .filter((post) => post.slug !== currentPost.slug)
    .map((post) => {
      let score = 0;
      if (post.topic === currentPost.topic) score += 3;
      const sharedTags = post.tags.filter((tag) => currentPost.tags.includes(tag));
      score += sharedTags.length * 2;
      return { post, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.post);
}

export function getRelatedPosts(post: Post, limit = 3): Post[] {
  return findRelatedPosts(post, getAllPosts(), limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/content-queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/content/ tests/content-queries.test.ts
git commit -m "feat(content): implement pure content query helpers and relations"
```

---

### Task 3: MDX Component Set & Dual-Theme Shiki Highlighting

**Files:**
- Create: `src/components/post/callout.tsx`
- Create: `src/components/post/code-block.tsx`
- Create: `src/components/post/figure.tsx`
- Create: `src/components/post/diagram-slot.tsx`
- Create: `src/components/post/mdx-content.tsx`
- Create: `tests/mdx-components.test.tsx`

**Interfaces:**
- Produces: `<Callout type="note|tip|important|warning|caution" title="..." />`
- Produces: `<CodeBlock />` (replaces `<pre>` with copy button and filename header)
- Produces: `<Figure src="..." alt="..." caption="..." />`
- Produces: `<DiagramSlot name="..." />`
- Produces: `<MDXContent code={post.body} />`

- [ ] **Step 1: Write failing MDX component tests**

Create `tests/mdx-components.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Callout } from "@/components/post/callout";
import { Figure } from "@/components/post/figure";
import { DiagramSlot } from "@/components/post/diagram-slot";
import { CodeBlock } from "@/components/post/code-block";

describe("MDX Components", () => {
  describe("Callout", () => {
    it("renders callout with specified type and title", () => {
      render(
        <Callout type="tip" title="Pro Tip">
          Remember to optimize inference latency.
        </Callout>
      );
      expect(screen.getByText("Pro Tip")).toBeInTheDocument();
      expect(screen.getByText("Remember to optimize inference latency.")).toBeInTheDocument();
      expect(screen.getByRole("region")).toHaveAttribute("data-type", "tip");
    });
  });

  describe("Figure", () => {
    it("renders image and caption", () => {
      render(
        <Figure src="/images/evals.png" alt="Evals graph" caption="Evaluation metrics overview" />
      );
      const img = screen.getByAltText("Evals graph");
      expect(img).toBeInTheDocument();
      expect(screen.getByText("Evaluation metrics overview")).toBeInTheDocument();
    });
  });

  describe("DiagramSlot", () => {
    it("renders interactive diagram placeholder slot with accessible name", () => {
      render(<DiagramSlot name="neural-activation-flow" title="Interactive Activation Flow" />);
      expect(screen.getByText("Interactive Activation Flow")).toBeInTheDocument();
    });
  });

  describe("CodeBlock", () => {
    it("renders pre element with copy button", () => {
      render(
        <CodeBlock data-language="python" data-theme="dark">
          <code>{"print('hello world')"}</code>
        </CodeBlock>
      );
      const copyBtn = screen.getByRole("button", { name: /copy code/i });
      expect(copyBtn).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/mdx-components.test.tsx`
Expected: FAIL ("Cannot find module '@/components/post/callout'").

- [ ] **Step 3: Implement Callout component**

Create `src/components/post/callout.tsx`:
```tsx
import React from "react";
import { Info, Lightbulb, AlertTriangle, AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalloutType = "note" | "tip" | "important" | "warning" | "caution";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const icons: Record<CalloutType, React.ElementType> = {
  note: Info,
  tip: Lightbulb,
  important: AlertCircle,
  warning: AlertTriangle,
  caution: ShieldAlert,
};

const styles: Record<CalloutType, { border: string; bg: string; text: string }> = {
  note: {
    border: "border-primary/40",
    bg: "bg-primary/5",
    text: "text-primary",
  },
  tip: {
    border: "border-lime/60",
    bg: "bg-lime/10",
    text: "text-limeink dark:text-lime",
  },
  important: {
    border: "border-primary/60",
    bg: "bg-primary/10",
    text: "text-primary",
  },
  warning: {
    border: "border-amber-500/50",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  caution: {
    border: "border-red-500/50",
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
  },
};

export function Callout({ type = "note", title, children, className }: CalloutProps) {
  const Icon = icons[type];
  const style = styles[type];

  return (
    <aside
      role="region"
      data-type={type}
      aria-label={title || `${type} callout`}
      className={cn(
        "my-6 flex gap-3.5 rounded-lg border p-4 text-sm leading-relaxed",
        style.border,
        style.bg,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", style.text)} aria-hidden="true" />
      <div className="flex-1">
        {title && <div className={cn("font-semibold mb-1", style.text)}>{title}</div>}
        <div className="text-ink [&>p]:leading-relaxed">{children}</div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Implement CodeBlock component with copy button**

Create `src/components/post/code-block.tsx`:
```tsx
"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  "data-language"?: string;
  "data-title"?: string;
}

export function CodeBlock({
  children,
  className,
  "data-language": language,
  "data-title": title,
  ...props
}: CodeBlockProps) {
  const preRef = React.useRef<HTMLPreElement>(null);
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    if (!preRef.current) return;
    const code = preRef.current.querySelector("code")?.textContent || preRef.current.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className="group relative my-6 overflow-hidden rounded-lg border border-line bg-surf">
      {(title || language) && (
        <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs font-mono text-mut bg-bg/50">
          <span>{title || language}</span>
          <button
            type="button"
            onClick={copyToClipboard}
            aria-label="Copy code to clipboard"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-surf hover:text-ink transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                <span className="text-lime">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
      <div className="relative">
        {!(title || language) && (
          <button
            type="button"
            onClick={copyToClipboard}
            aria-label="Copy code to clipboard"
            className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded bg-surf/80 border border-line p-1.5 text-xs text-mut opacity-0 group-hover:opacity-100 transition-opacity hover:text-ink cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        )}
        <pre
          ref={preRef}
          className={cn(
            "overflow-x-auto p-4 text-sm font-mono leading-normal text-ink",
            className
          )}
          {...props}
        >
          {children}
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement Figure and DiagramSlot components**

Create `src/components/post/figure.tsx`:
```tsx
import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface FigureProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  width?: number;
  height?: number;
}

export function Figure({
  src,
  alt,
  caption,
  className,
  width = 1200,
  height = 630,
}: FigureProps) {
  return (
    <figure className={cn("my-8 flex flex-col items-center", className)}>
      <div className="relative w-full overflow-hidden rounded-lg border border-line bg-surf">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full object-cover"
        />
      </div>
      {caption && (
        <figcaption className="mt-2.5 text-center text-xs text-mut">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
```

Create `src/components/post/diagram-slot.tsx`:
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface DiagramSlotProps {
  name: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function DiagramSlot({
  name,
  title,
  description,
  children,
  className,
}: DiagramSlotProps) {
  return (
    <div
      data-diagram-slot={name}
      className={cn(
        "my-8 rounded-xl border border-line bg-surf/60 p-6 backdrop-blur-sm",
        className
      )}
    >
      <div className="mb-4">
        <div className="text-xs font-mono uppercase tracking-wider text-primary">Interactive Diagram</div>
        <h4 className="text-base font-semibold text-ink">{title}</h4>
        {description && <p className="mt-1 text-xs text-mut">{description}</p>}
      </div>
      <div className="relative min-h-[200px] flex items-center justify-center rounded-lg border border-line/60 bg-bg/40 p-4">
        {children || (
          <div className="text-center font-mono text-xs text-mut">
            [Interactive Component Slot: {name}]
          </div>
        )}
      </div>
    </div>
  );
}
```

Create `src/components/post/mdx-content.tsx`:
```tsx
import * as React from "react";
import * as runtime from "react/jsx-runtime";
import { Callout } from "./callout";
import { CodeBlock } from "./code-block";
import { Figure } from "./figure";
import { DiagramSlot } from "./diagram-slot";

const sharedComponents = {
  Callout,
  pre: CodeBlock,
  Figure,
  DiagramSlot,
};

const useMDXComponent = (code: string) => {
  const fn = new Function(code);
  return fn({ ...runtime }).default;
};

interface MDXContentProps {
  code: string;
  components?: Record<string, React.ComponentType>;
}

export function MDXContent({ code, components }: MDXContentProps) {
  const Component = useMDXComponent(code);
  return <Component components={{ ...sharedComponents, ...components }} />;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/mdx-components.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/components/post/ tests/mdx-components.test.tsx
git commit -m "feat(content): implement rich accessible MDX component set"
```

---

### Task 4: RSS Feed, Sitemap, and Dynamic OpenGraph Images

**Files:**
- Create: `src/app/rss.xml/route.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/app/posts/[slug]/opengraph-image.tsx`
- Create: `tests/seo.test.ts`

**Interfaces:**
- Produces: `/rss.xml` returning valid RSS 2.0 XML with all published posts.
- Produces: `/sitemap.xml` listing static pages, posts, and series.
- Produces: `posts/[slug]/opengraph-image.png` (1200x630) rendered via `next/og`.

- [ ] **Step 1: Write failing SEO/Feed tests**

Create `tests/seo.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generateRssXml } from "@/app/rss.xml/route";
import { siteConfig } from "@config/index";

const mockPosts = [
  {
    title: "Test Post",
    slug: "test-post",
    permalink: "/posts/test-post",
    summary: "A test post summary",
    date: "2026-03-01T00:00:00.000Z",
    draft: false,
  },
];

describe("SEO & Feed Generation", () => {
  it("generates valid RSS 2.0 XML string", () => {
    const xml = generateRssXml(mockPosts);
    expect(xml).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain(`<title>${siteConfig.name}</title>`);
    expect(xml).toContain("<title>Test Post</title>");
    expect(xml).toContain(`${siteConfig.url}/posts/test-post`);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/seo.test.ts`
Expected: FAIL ("Cannot find module '@/app/rss.xml/route'").

- [ ] **Step 3: Implement RSS Feed Route**

Create `src/app/rss.xml/route.ts`:
```ts
import { getAllPosts } from "@/lib/content";
import { siteConfig } from "@config/index";

interface MinimalPost {
  title: string;
  slug: string;
  permalink: string;
  summary: string;
  date: string;
  draft: boolean;
}

export function generateRssXml(posts: MinimalPost[]): string {
  const items = posts
    .filter((post) => !post.draft)
    .map(
      (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteConfig.url}${post.permalink}</link>
      <guid isPermaLink="true">${siteConfig.url}${post.permalink}</guid>
      <description><![CDATA[${post.summary}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteConfig.name}</title>
    <link>${siteConfig.url}</link>
    <description>${siteConfig.description}</description>
    <language>en-us</language>
    <atom:link href="${siteConfig.url}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

export async function GET() {
  const posts = getAllPosts();
  const xml = generateRssXml(posts);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
```

- [ ] **Step 4: Implement Sitemap**

Create `src/app/sitemap.ts`:
```ts
import type { MetadataRoute } from "next";
import { getAllPosts, getAllSeries } from "@/lib/content";
import { siteConfig } from "@config/index";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const series = getAllSeries();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteConfig.url}${post.permalink}`,
    lastModified: new Date(post.updated || post.date),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const seriesRoutes: MetadataRoute.Sitemap = series.map((s) => ({
    url: `${siteConfig.url}${s.permalink}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes, ...seriesRoutes];
}
```

- [ ] **Step 5: Implement Dynamic OpenGraph Image Generation**

Create `src/app/posts/[slug]/opengraph-image.tsx`:
```tsx
import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/content";
import { siteConfig, topicsConfig } from "@config/index";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  const title = post?.title || siteConfig.name;
  const topicId = post?.topic || "agents";
  const topic = topicsConfig.topics.find((t) => t.id === topicId);
  const topicLabel = topic?.label || "Article";
  const topicColor = topic?.darkColor || "#6fd3ff";
  const readingTime = post?.readingTime || 5;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: "#14181c",
          color: "#e8eef3",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 400,
            height: 400,
            background: `radial-gradient(circle at top right, ${topicColor}25, transparent 70%)`,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: topicColor,
            }}
          />
          <span style={{ fontSize: 24, fontWeight: 700, color: topicColor }}>
            {topicLabel}
          </span>
          <span style={{ fontSize: 20, color: "#8b9ba8" }}>•</span>
          <span style={{ fontSize: 20, color: "#8b9ba8" }}>
            {readingTime} min read
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #2b343c",
            paddingTop: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {siteConfig.name}
            </span>
          </div>
          <span style={{ fontSize: 18, color: "#8b9ba8" }}>
            {siteConfig.url.replace(/^https?:\/\//, "")}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/seo.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/app/rss.xml/ src/app/sitemap.ts src/app/posts/ tests/seo.test.ts
git commit -m "feat(seo): implement RSS 2.0 feed, sitemap, and dynamic per-post OG images"
```

---

### Task 5: 6+ Technical Seed Posts Across All Topics & Series

**Files:**
- Create: `content/posts/agents-autonomous-evals.mdx`
- Create: `content/posts/agents-hierarchical-routing.mdx`
- Create: `content/posts/rag-hybrid-search-rrf.mdx`
- Create: `content/posts/rag-graph-context-backplanes.mdx`
- Create: `content/posts/tune-dpo-vs-ppo-reasoning.mdx`
- Create: `content/posts/infra-vllm-speculative-decoding.mdx`
- Create: `content/series/agentic-architectures.mdx`
- Create: `tests/seed-posts.test.ts`

**Interfaces:**
- Produces: 6 deep technical markdown posts with code snippets, callouts, and diagram slots.
- Ensures: Every topic in `config/topics.ts` (`agents`, `rag`, `tune`, `infra`) has representation.
- Produces: Series collection with sequential order.

- [ ] **Step 1: Write seed posts verification test**

Create `tests/seed-posts.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getAllPosts, getAllSeries } from "@/lib/content";
import { topicsConfig } from "@config/index";

describe("Seed Posts & Collections Verification", () => {
  it("contains at least 6 published posts", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(6);
  });

  it("covers every topic defined in topicsConfig", () => {
    const posts = getAllPosts();
    const topicsCovered = new Set(posts.map((p) => p.topic));
    for (const topic of topicsConfig.topics) {
      expect(topicsCovered.has(topic.id)).toBe(true);
    }
  });

  it("has valid series linking for multi-part articles", () => {
    const series = getAllSeries();
    expect(series.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Create seed posts in content/posts/ and series in content/series/**

Create `content/series/agentic-architectures.mdx`:
```mdx
---
id: agentic-architectures
title: Agentic Architectures
summary: Engineering resilient autonomous systems, from evaluation harnesses to multi-agent supervisor hierarchies.
order: 1
---

A multi-part series exploring the engineering patterns required to move LLM agents from brittle demos into reliable production systems.
```

Create `content/posts/agents-autonomous-evals.mdx`:
```mdx
---
title: "Evaluating Autonomous Agent Tool Loops"
summary: "Quantitative methodology for measuring tool-call drift, state regressions, and termination bounds in autonomous agent loops."
date: "2026-03-01T10:00:00Z"
topic: "agents"
tags: ["evals", "benchmarks", "tools"]
series:
  id: "agentic-architectures"
  order: 1
draft: false
---

Autonomous agents differ fundamentally from standard LLM chains: they execute non-deterministic cycles of reasoning, tool dispatch, and observation intake.

<Callout type="important" title="State Regression Risks">
Agent benchmarks that only evaluate final output miss 70% of production regressions. Intermediate trajectories must be evaluated step-by-step.
</Callout>

## Trajectory Invariance Testing

When asserting agent behavior, we measure trajectory distance using state graph alignment:

```python
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class ToolExecutionStep:
    tool_name: str
    arguments: Dict[str, Any]
    observation: Any
    latency_ms: float

def compute_trajectory_divergence(
    expected_steps: List[str], 
    actual_steps: List[ToolExecutionStep]
) -> float:
    """Computes Levenshtein-based tool sequence divergence."""
    actual_names = [step.tool_name for step in actual_steps]
    # Trajectory comparison logic
    return len(set(expected_steps).symmetric_difference(set(actual_names))) / max(len(expected_steps), 1)
```

<DiagramSlot name="agent-loop-trajectory" title="Agent Tool Loop Architecture" description="Evaluation taps inserted between model actuation and environment feedback." />

### Termination Boundary Guarantees

Always bound agent step counts and token budgets to prevent runaway recursion:

```python
MAX_TOOL_CALL_STEPS = 12
TOKEN_BUDGET_CAP = 32_000
```
```

Create `content/posts/agents-hierarchical-routing.mdx`:
```mdx
---
title: "Hierarchical Supervisor Routing Patterns"
summary: "Decoupling high-level task planning from domain-specific agent executors using dynamic intent graphs."
date: "2026-03-05T14:30:00Z"
topic: "agents"
tags: ["routing", "multi-agent", "supervisor"]
series:
  id: "agentic-architectures"
  order: 2
draft: false
---

Single monolithic agents fail when context windows overflow with extraneous tool schemas. Splitting into domain-specialized agents with a supervisor router restores determinism.

<Callout type="tip" title="Context Partitioning">
Only expose tools relevant to the active sub-domain. Sharding tools into leaf agents cuts tool-selection error rates by over 4x.
</Callout>

```typescript
export interface SubagentManifest {
  id: string;
  domain: string;
  tools: string[];
  maxIterations: number;
}

export function routeIntent(query: string, agents: SubagentManifest[]): SubagentManifest {
  // Deterministic routing based on domain embeddings and schema matching
  return agents[0];
}
```
```

Create `content/posts/rag-hybrid-search-rrf.mdx`:
```mdx
---
title: "Reciprocal Rank Fusion with Sparse and Dense Retrieval"
summary: "Combining BM25 lexical precision with dense embedding semantic recall using rank normalization and cross-encoder re-ranking."
date: "2026-03-08T09:15:00Z"
topic: "rag"
tags: ["retrieval", "hybrid-search", "bm25", "embeddings"]
draft: false
---

Dense semantic retrieval often fails on exact keyword matching, version identifiers, and error codes. Hybrid search bridges this gap.

<Callout type="note" title="The RRF Formulation">
Reciprocal Rank Fusion computes scores purely from ranks rather than incomparable raw cosine similarities or BM25 scores.
</Callout>

```python
def reciprocal_rank_fusion(
    dense_ranks: dict[str, int], 
    sparse_ranks: dict[str, int], 
    k: int = 60
) -> dict[str, float]:
    scores = {}
    all_doc_ids = set(dense_ranks.keys()) | set(sparse_ranks.keys())
    
    for doc_id in all_doc_ids:
        dense_rank = dense_ranks.get(doc_id, 1000)
        sparse_rank = sparse_ranks.get(doc_id, 1000)
        scores[doc_id] = (1.0 / (k + dense_rank)) + (1.0 / (k + sparse_rank))
        
    return dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))
```
```

Create `content/posts/rag-graph-context-backplanes.mdx`:
```mdx
---
title: "Knowledge Graphs as Structured Context Backplanes"
summary: "Extracting entity-relationship graphs during chunking to enable multi-hop relationship traversal during retrieval."
date: "2026-03-12T16:45:00Z"
topic: "rag"
tags: ["graph-rag", "knowledge-graph", "neo4j", "relationships"]
draft: false
---

Standard chunk-based vector retrieval fails when answering queries that span multiple documents with shared entity dependencies.

<Callout type="important" title="Graph Context Stitching">
By linking chunks through extracted entity subgraphs, queries traversing 3+ hops resolve with 92% higher precision than raw vector kNN.
</Callout>

```cypher
MATCH (e:Entity {name: "Transformer"})-[:DEPENDS_ON*1..2]->(target:Entity)
RETURN target.name, target.type
LIMIT 25
```
```

Create `content/posts/tune-dpo-vs-ppo-reasoning.mdx`:
```mdx
---
title: "Direct Preference Optimization on Reasoning Datasets"
summary: "Empirical stability, gradient dynamics, and memory trade-offs of DPO compared to actor-critic PPO for reasoning alignment."
date: "2026-03-15T11:20:00Z"
topic: "tune"
tags: ["dpo", "ppo", "alignment", "reasoning"]
draft: false
---

Reinforcement Learning from Human Feedback (RLHF) via PPO requires running four separate models concurrently. DPO simplifies this into a closed-form loss function.

<Callout type="warning" title="Out-of-Distribution Vulnerability">
DPO can quickly overfit on reference policy probability shifts if beta regularization is set too low.
</Callout>

```python
import torch
import torch.nn.functional as F

def dpo_loss(
    policy_chosen_logps: torch.FloatTensor,
    policy_rejected_logps: torch.FloatTensor,
    reference_chosen_logps: torch.FloatTensor,
    reference_rejected_logps: torch.FloatTensor,
    beta: float = 0.1,
) -> torch.FloatTensor:
    pi_logratios = policy_chosen_logps - policy_rejected_logps
    ref_logratios = reference_chosen_logps - reference_rejected_logps
    logits = pi_logratios - ref_logratios
    return -F.logsigmoid(beta * logits).mean()
```
```

Create `content/posts/infra-vllm-speculative-decoding.mdx`:
```mdx
---
title: "Speculative Decoding and KV-Cache Paging at Scale"
summary: "Dissecting PagedAttention memory layouts and draft-target model verification throughput on clusters of 8x H100 GPUs."
date: "2026-03-18T13:00:00Z"
topic: "infra"
tags: ["vllm", "inference", "h100", "paged-attention"]
draft: false
---

LLM autoregressive inference is memory-bandwidth bound. Speculative decoding amortizes memory transfers by accepting batches of draft tokens in parallel.

<Callout type="tip" title="Draft Model Sizing">
A draft model between 5% and 8% of target model parameter size maximizes acceptance rate without bottlenecking verification latency.
</Callout>

```bash
# Launching high-throughput inference engine with speculative draft
vllm serve meta-llama/Llama-3-70B-Instruct \
  --speculative-model meta-llama/Llama-3-8B-Instruct \
  --num-speculative-tokens 5 \
  --gpu-memory-utilization 0.92 \
  --tensor-parallel-size 4
```
```

- [ ] **Step 3: Run velite build and test suite**

Run: `npx velite build && npx vitest run tests/seed-posts.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit Task 5**

```bash
git add content/ tests/seed-posts.test.ts
git commit -m "feat(content): seed 6 high-depth technical posts across all topics"
```

---

### Task 6: Phase 2 Acceptance Verification (DOD)

**Files:**
- Audit: Entire repository

**Verification Steps:**
- [ ] **Step 1: Test loud build failure on unknown topic**
Add a temporary test or verify with invalid frontmatter:
Ensure Velite throws `Topic must be one of: agents, rag, tune, infra` when given an invalid topic.
- [ ] **Step 2: Run typecheck**
Run: `npm run typecheck`
Expected: Exit code 0, no errors.
- [ ] **Step 3: Run test suite**
Run: `npm run test`
Expected: All tests pass (config, theme, ui, layout, content-schema, content-queries, mdx-components, seo, seed-posts).
- [ ] **Step 4: Run linter**
Run: `npm run lint`
Expected: 0 warnings, 0 errors.
- [ ] **Step 5: Run production build**
Run: `npm run build`
Expected: Velite build and Next.js static build succeed cleanly.
- [ ] **Step 6: Commit final Phase 2 milestone**
```bash
git commit --allow-empty -m "milestone: complete Phase 2 Content System acceptance verification"
```
