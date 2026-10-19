#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const VALID_TOPICS = ["agents", "rag", "tuning", "infra"];

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--title" && args[i + 1]) {
      result.title = args[i + 1];
      i++;
    } else if (args[i] === "--topic" && args[i + 1]) {
      result.topic = args[i + 1];
      i++;
    } else if (args[i] === "--summary" && args[i + 1]) {
      result.summary = args[i + 1];
      i++;
    } else if (args[i] === "--tags" && args[i + 1]) {
      result.tags = args[i + 1].split(",").map((t) => t.trim());
      i++;
    }
  }
  return result;
}

async function prompt(questionText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(questionText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n⚡ Epoch — New Post Scaffolder\n");

  const cliArgs = parseArgs();

  let title = cliArgs.title;
  if (!title) {
    title = await prompt("Enter post title: ");
    if (!title) {
      console.error("❌ Title is required.");
      process.exit(1);
    }
  }

  let topic = cliArgs.topic;
  if (!topic || !VALID_TOPICS.includes(topic)) {
    console.log(`Available topics: ${VALID_TOPICS.join(", ")}`);
    topic = await prompt(`Choose topic [${VALID_TOPICS[0]}]: `);
    if (!topic) topic = VALID_TOPICS[0];
    if (!VALID_TOPICS.includes(topic)) {
      console.error(`❌ Invalid topic. Must be one of: ${VALID_TOPICS.join(", ")}`);
      process.exit(1);
    }
  }

  let summary = cliArgs.summary;
  if (!summary) {
    summary = await prompt("Enter short summary (1-2 sentences): ");
    if (!summary) {
      summary = `Technical deep-dive on ${title.toLowerCase()}.`;
    }
  }

  const slug = slugify(title);
  const postsDir = path.join(process.cwd(), "content", "posts");
  const filePath = path.join(postsDir, `${slug}.mdx`);

  if (fs.existsSync(filePath)) {
    console.error(`❌ A post already exists at content/posts/${slug}.mdx`);
    process.exit(1);
  }

  const now = new Date().toISOString();
  const tags = cliArgs.tags || [topic, "ai"];

  const content = `---
title: ${JSON.stringify(title)}
summary: ${JSON.stringify(summary)}
date: ${JSON.stringify(now)}
topic: ${JSON.stringify(topic)}
tags: ${JSON.stringify(tags)}
draft: false
---

An introduction to ${title.toLowerCase()}...

<Callout type="tip" title="Architectural Note">
Key insights and core principles for this engineering approach.
</Callout>

## Architecture Overview

Describe the systems architecture, trade-offs, and throughput metrics.

\`\`\`typescript
// Example implementation snippet
export interface PipelineConfig {
  concurrency: number;
  batchSize: number;
}
\`\`\`

## Performance & Benchmarks

Summarize quantitative findings and evaluation scores across target workloads.
`;

  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`\n✅ Post created successfully!`);
  console.log(`📄 File: content/posts/${slug}.mdx`);
  console.log(`🌐 Preview will appear at: http://localhost:3000/posts/${slug}\n`);
}

main().catch((err) => {
  console.error("Error creating post:", err);
  process.exit(1);
});
