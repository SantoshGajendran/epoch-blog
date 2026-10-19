import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("CLI Post Scaffolding Tool", () => {
  const rootDir = process.cwd();
  const testSlug = "test-automated-scaffold-post";
  const testFilePath = path.join(rootDir, "content", "posts", `${testSlug}.mdx`);

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it("scaffolds a valid .mdx post file using CLI flags", () => {
    execSync(
      `node scripts/create-post.mjs --title "Test Automated Scaffold Post" --topic agents --summary "Testing scaffolding script." --tags "test,scaffold"`,
      { cwd: rootDir }
    );

    expect(fs.existsSync(testFilePath)).toBe(true);
    const content = fs.readFileSync(testFilePath, "utf-8");

    expect(content).toContain('title: "Test Automated Scaffold Post"');
    expect(content).toContain('topic: "agents"');
    expect(content).toContain('summary: "Testing scaffolding script."');
    expect(content).toContain('draft: false');
    expect(content).toContain('<Callout');
  });
});
