# Epoch — Cybernetic AI Research & Engineering Publication

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSantoshGajendran%2Fepoch-blog)

An immersive tech and AI research blog covering autonomous agents, RAG, fine-tuning, and scalable inference infrastructure. Built with Next.js 15, React 19, Three.js, GSAP, Web Audio API, and Velite MDX.

---

## Features

- **Atmospheric Neural Network Map**: Interactive feed-forward network topology representing content topics and posts in 2D Canvas and 3D WebGL (Three.js) with spatial layer depth, raycasting, and free spherical drag-to-orbit with wheel zoom.
- **Glacier Circuit Aesthetic**: High-contrast dark and light themes with lime accents, frosted glassmorphism, and reactive ambient aurora luminescence.
- **Live Cybernetic Telemetry HUD**: Monospace HUD status bar tracking cluster status, active nodes, signal pulse frequency (Hz), and simulated inference latency.
- **Synthesized Web Audio Feedback**: Algorithmic Web Audio micro-interaction synthesizer for tactile node clicks and diagram transitions (zero external audio file downloads, muted by default).
- **Header Audio Micro-Visualizer**: Dynamic 5-bar micro-equalizer reacting to sound synthesis and mute state.
- **3D Perspective Spotlight Cards**: Interactive cards with cursor-following radial spotlight illumination and 3D perspective hover tilt.
- **Interactive Architecture Diagrams**: Step-through GSAP technical diagrams embedded natively in MDX articles.
- **Sub-10ms Command Palette**: Fuzzy search for posts, topics, series, and system actions (`Ctrl+K` / `Cmd+K` or `/`).
- **Zero-Code Content Engine**: Type-safe MDX content pipeline powered by Velite. Adding an article automatically populates the neural map, search index, RSS feed, and sitemap.

---

## Deploy to Vercel (100% Free)

Epoch is 100% self-contained and pre-configured for free hosting on **Vercel**'s Hobby tier ($0/month).

### 3-Step Setup Guide

#### Step 1: Create a GitHub Repository
If you haven't pushed your code to GitHub yet, create a new repository on [GitHub](https://github.com/new) and push your local commits:

```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M master
git push -u origin master
```

#### Step 2: Import Project on Vercel
1. Log in to [vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New...** > **Project**.
3. Locate your repository in the list and click **Import**.
4. Leave all build settings at their defaults:
   - **Framework Preset**: Next.js
   - **Build Command**: `velite build --strict && next build` (automatically detected from `package.json`)
   - **Output Directory**: `.next`
   - **Environment Variables**: None required!
5. Click **Deploy**.

#### Step 3: Enjoy Your Free Live Site
- Vercel automatically compiles your site, assigns a free SSL certificate, and provides a permanent live URL (e.g. `https://your-blog.vercel.app`).
- Every subsequent `git push` will automatically trigger a new deployment in ~60 seconds.

---

## Local Development

### Prerequisites
- Node.js 20.x or 22.x LTS
- npm 10+

### Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run the development server (Velite watcher + Next.js dev)
npm run dev

# 3. Open in browser
open http://localhost:3000
```

### Build & Verification Commands

```bash
# Run unit & integration test suite (Vitest)
npm run test

# Run static TypeScript typecheck
npm run typecheck

# Run Next.js linter
npm run lint

# Build production static bundle
npm run build

# Start local production preview server
npm run start
```

---

## How to Add New Posts

Articles live in `content/posts/<slug>.mdx`. To publish a new post:

1. Create a new `.mdx` file in `content/posts/`, e.g., `content/posts/my-new-article.mdx`:

```markdown
---
title: "Distributed Memory Pipelines in Agentic Frameworks"
summary: "Exploring shared KV cache pools and async state synchronization across cooperative autonomous agents."
date: "2026-10-19T20:00:00Z"
topic: "agents"
tags: ["agents", "memory", "distributed"]
draft: false
---

Your article content in standard Markdown and MDX...

<Callout type="tip" title="Pro Tip">
Use callout boxes for architectural notes and gotchas.
</Callout>
```

2. Valid `topic` values:
   - `agents` — Autonomous Agents
   - `rag` — Retrieval-Augmented Generation
   - `tuning` — Fine-Tuning & Alignment
   - `infra` — Scalable Inference Infrastructure

3. Once saved, the new article is automatically injected into the 2D and 3D neural maps, indexed in search, added to RSS, and generated as a static page at `/posts/my-new-article`.

---

## License

MIT © Epoch Blog Contributors
