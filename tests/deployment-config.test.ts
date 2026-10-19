import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Vercel Free Deployment Configuration", () => {
  const rootDir = process.cwd();
  const vercelJsonPath = path.join(rootDir, "vercel.json");
  const packageJsonPath = path.join(rootDir, "package.json");
  const readmePath = path.join(rootDir, "README.md");

  it("has a valid vercel.json with production security headers", () => {
    expect(fs.existsSync(vercelJsonPath)).toBe(true);
    const content = fs.readFileSync(vercelJsonPath, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.headers).toBeDefined();
    expect(Array.isArray(parsed.headers)).toBe(true);

    const globalHeaders = parsed.headers.find(
      (h: { source: string }) => h.source === "/(.*)"
    );
    expect(globalHeaders).toBeDefined();

    const headerMap = new Map(
      globalHeaders.headers.map((h: { key: string; value: string }) => [
        h.key.toLowerCase(),
        h.value,
      ])
    );

    expect(headerMap.get("x-content-type-options")).toBe("nosniff");
    expect(headerMap.get("x-frame-options")).toBe("DENY");
    expect(headerMap.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin"
    );
  });

  it("ensures package.json build script triggers velite and next build", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    expect(pkg.scripts.build).toBe("velite build --strict && next build");
  });

  it("ensures README.md documents Vercel free deployment instructions", () => {
    expect(fs.existsSync(readmePath)).toBe(true);
    const readme = fs.readFileSync(readmePath, "utf-8");
    expect(readme.toLowerCase()).toContain("deploy to vercel");
    expect(readme.toLowerCase()).toContain("vercel.com");
  });
});
