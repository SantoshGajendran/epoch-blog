import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PostPage, { generateStaticParams, generateMetadata } from "@/app/posts/[slug]/page";
import { RelatedPosts } from "@/components/post/related-posts";
import { getPostBySlug } from "@/lib/content";
import { siteConfig } from "@config/index";

describe("Post Reading Page & Related Posts", () => {
  beforeEach(() => {
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  describe("generateStaticParams", () => {
    it("generates static params for all seed posts", async () => {
      const params = await generateStaticParams();
      expect(params.length).toBeGreaterThanOrEqual(6);
      expect(params.some((p) => p.slug === "agents-autonomous-evals")).toBe(true);
    });
  });

  describe("generateMetadata", () => {
    it("generates metadata for an existing post", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "agents-autonomous-evals" }),
      });

      expect(metadata.title).toContain("Evaluating Autonomous Agent Tool Loops");
      expect(metadata.title).toContain(siteConfig.name);
      expect(metadata.description).toBeDefined();
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.twitter).toBeDefined();
    });

    it("generates fallback metadata for a non-existent post", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "non-existent-slug" }),
      });

      expect(metadata.title).toContain("Not Found");
      expect(metadata.title).toContain(siteConfig.name);
    });
  });

  describe("RelatedPosts", () => {
    it("renders related posts component with topic badge", () => {
      const post = getPostBySlug("agents-autonomous-evals");
      expect(post).toBeDefined();
      if (post) {
        render(<RelatedPosts post={post} />);
        expect(screen.getByText(siteConfig.ui.relatedPostsTitle)).toBeInTheDocument();
      }
    });

    it("returns null when there are no related posts", () => {
      const mockPost = {
        title: "Isolated Post",
        slug: "isolated-post",
        permalink: "/posts/isolated-post",
        summary: "An isolated summary",
        date: "2026-03-01T00:00:00.000Z",
        topic: "unknown-topic",
        tags: ["isolated-unique-tag"],
        draft: false,
        readingTime: 3,
        toc: [],
        body: "",
        metadata: {},
      };

      const { container } = render(<RelatedPosts post={mockPost as any} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("PostPage", () => {
    it("renders complete post page with title, takeaways, and MDX content", async () => {
      const pageComponent = await PostPage({
        params: Promise.resolve({ slug: "agents-autonomous-evals" }),
      });

      render(pageComponent);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Evaluating Autonomous Agent Tool Loops");
      expect(screen.getByText(siteConfig.ui.keyTakeawaysTitle)).toBeInTheDocument();
      expect(screen.getByText(siteConfig.ui.backToMapLabel)).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: siteConfig.ui.sharePostLabel })).toBeInTheDocument();
    });

    it("renders series navigation for a post in a series", async () => {
      const pageComponent = await PostPage({
        params: Promise.resolve({ slug: "agents-autonomous-evals" }),
      });

      render(pageComponent);
      expect(screen.getAllByText("Agentic Architectures").length).toBeGreaterThan(0);
    });

    it("calls notFound when post slug is missing", async () => {
      await expect(
        PostPage({
          params: Promise.resolve({ slug: "non-existent-slug" }),
        })
      ).rejects.toThrow();
    });
  });
});
