import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { SoundProvider } from "@/lib/audio/sound-provider";
import { soundEffects, resetHoverThrottleForTesting } from "@/lib/audio/sound-effects";
import { PostPreviewCard } from "@/components/network/post-preview-card";
import { PostListView } from "@/components/network/post-list-view";
import type { Post } from "@/lib/content";

function createMockPost(overrides: Partial<Post> = {}): Post {
  return {
    slug: "test-cybernetic-post",
    title: "Cybernetic Immersion Architecture",
    summary: "Exploring responsive WebGL nodes and spatial tactile interactions.",
    date: "2026-10-19",
    topic: "agents",
    tags: ["interactive", "webgl"],
    permalink: "/posts/test-cybernetic-post",
    readingTime: 4,
    draft: false,
    toc: [],
    body: "Full body content",
    metadata: { readingTime: 4, wordCount: 800 },
    ...overrides,
  };
}

const mockPost: Post = createMockPost();

describe("SpotlightCard Component", () => {
  beforeEach(() => {
    localStorage.clear();
    resetHoverThrottleForTesting();

    if (typeof window !== "undefined" && !window.PointerEvent) {
      window.PointerEvent = window.MouseEvent as unknown as typeof PointerEvent;
    }

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children cleanly without altering content or layout structure", () => {
    render(
      <SpotlightCard className="custom-class" data-testid="test-card">
        <span data-testid="child-element">Cybernetic Node Content</span>
      </SpotlightCard>
    );

    const card = screen.getByTestId("test-card");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("custom-class");
    expect(screen.getByTestId("child-element")).toHaveTextContent("Cybernetic Node Content");
  });

  it("updates 3D tilt transform and radial glow position on pointer move", () => {
    const { container } = render(
      <SpotlightCard data-testid="tilt-card" maxTilt={6}>
        <div>Card Inner</div>
      </SpotlightCard>
    );

    const card = screen.getByTestId("tilt-card");

    // Mock bounding client rect: 200px wide, 100px high, offset at (0, 0)
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Move pointer to (50, 25)
    // nx = (50 / 200 - 0.5) * 2 = -0.5
    // ny = (25 / 100 - 0.5) * 2 = -0.5
    // rotateX = -ny * 6 = 3deg
    // rotateY = nx * 6 = -3deg
    fireEvent.pointerEnter(card);
    fireEvent.pointerMove(card, { clientX: 50, clientY: 25 });

    expect(card.style.transform).toContain("perspective(1000px)");
    expect(card.style.transform).toContain("rotateX(3deg)");
    expect(card.style.transform).toContain("rotateY(-3deg)");

    const glow = container.querySelector('[data-testid="spotlight-glow"]') as HTMLElement;
    expect(glow).toBeInTheDocument();
    expect(glow.style.opacity).toBe("1");
    expect(glow.style.background).toContain("radial-gradient(280px circle at 50px 25px");
  });

  it("resets 3D tilt transform and smoothly fades out glow on pointer leave", () => {
    const { container } = render(
      <SpotlightCard data-testid="leave-card">
        <div>Content</div>
      </SpotlightCard>
    );

    const card = screen.getByTestId("leave-card");
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.pointerEnter(card);
    fireEvent.pointerMove(card, { clientX: 50, clientY: 25 });
    expect(card.style.transform).toContain("rotateX(3deg)");

    // Pointer leaves
    fireEvent.pointerLeave(card);

    expect(card.style.transform).toContain("rotateX(0deg)");
    expect(card.style.transform).toContain("rotateY(0deg)");
    expect(card.style.transition).toContain("transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)");

    const glow = container.querySelector('[data-testid="spotlight-glow"]') as HTMLElement;
    expect(glow.style.opacity).toBe("0");
  });

  it("completely suppresses 3D perspective tilt when prefers-reduced-motion is active", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <SpotlightCard data-testid="reduced-motion-card">
        <div>Accessible Content</div>
      </SpotlightCard>
    );

    const card = screen.getByTestId("reduced-motion-card");
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.pointerEnter(card);
    fireEvent.pointerMove(card, { clientX: 50, clientY: 25 });

    // Under reduced motion, 3D tilt is suppressed (no rotateX or rotateY)
    expect(card.style.transform).not.toContain("rotateX");
    expect(card.style.transform).not.toContain("rotateY");
  });

  it("respects enableTilt=false and enableGlow=false props", () => {
    const { container } = render(
      <SpotlightCard data-testid="disabled-card" enableTilt={false} enableGlow={false}>
        <div>Disabled Tilt and Glow</div>
      </SpotlightCard>
    );

    const card = screen.getByTestId("disabled-card");
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.pointerEnter(card);
    fireEvent.pointerMove(card, { clientX: 50, clientY: 25 });

    expect(card.style.transform).not.toContain("rotateX");
    expect(card.style.transform).not.toContain("rotateY");

    const glow = container.querySelector('[data-testid="spotlight-glow"]');
    expect(glow).toBeNull();
  });

  it("triggers useOptionalSound().playSound('hover') on pointer enter when sound is enabled", () => {
    localStorage.setItem("epoch_sound_enabled", "true");
    const hoverSpy = vi.spyOn(soundEffects, "playHoverTick").mockImplementation(() => {});

    render(
      <SoundProvider>
        <SpotlightCard data-testid="sound-card">
          <div>Sound Trigger Card</div>
        </SpotlightCard>
      </SoundProvider>
    );

    const card = screen.getByTestId("sound-card");
    fireEvent.pointerEnter(card);

    expect(hoverSpy).toHaveBeenCalledTimes(1);
    hoverSpy.mockRestore();
  });

  it("does not trigger sound on pointer enter when sound is disabled", () => {
    const hoverSpy = vi.spyOn(soundEffects, "playHoverTick").mockImplementation(() => {});

    render(
      <SoundProvider>
        <SpotlightCard data-testid="muted-card">
          <div>Muted Card</div>
        </SpotlightCard>
      </SoundProvider>
    );

    const card = screen.getByTestId("muted-card");
    fireEvent.pointerEnter(card);

    expect(hoverSpy).not.toHaveBeenCalled();
    hoverSpy.mockRestore();
  });

  describe("Component Integration", () => {
    it("integrates into PostPreviewCard as outer interactive container", () => {
      const onClose = vi.fn();
      render(<PostPreviewCard post={mockPost} onClose={onClose} />);

      const previewCard = screen.getByTestId("post-preview-card");
      expect(previewCard).toBeInTheDocument();

      // Verify Spotlight glow exists inside PostPreviewCard
      const glow = previewCard.querySelector('[data-testid="spotlight-glow"]');
      expect(glow).toBeInTheDocument();

      // Verify pointer move affects the preview card tilt
      vi.spyOn(previewCard, "getBoundingClientRect").mockReturnValue({
        left: 0,
        top: 0,
        right: 300,
        bottom: 200,
        width: 300,
        height: 200,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.pointerEnter(previewCard);
      fireEvent.pointerMove(previewCard, { clientX: 100, clientY: 80 });

      expect(previewCard.style.transform).toContain("perspective(1000px)");
      expect(previewCard.style.transform).toContain("rotateX");
      expect(previewCard.style.transform).toContain("rotateY");

      // Verify close button interaction is preserved
      const closeBtn = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("integrates into PostListView wrapping each post list item", () => {
      render(<PostListView posts={[mockPost]} />);

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();

      const items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(1);

      // Verify each item contains a spotlight card with glow overlay
      const spotlightCard = items[0].querySelector('[data-testid="spotlight-card"]') || items[0].querySelector('[data-testid="spotlight-glow"]')?.parentElement;
      expect(spotlightCard).toBeInTheDocument();

      const glow = items[0].querySelector('[data-testid="spotlight-glow"]');
      expect(glow).toBeInTheDocument();

      // Verify link works inside the spotlight card
      const link = screen.getByRole("link", { name: new RegExp(mockPost.title, "i") });
      expect(link).toHaveAttribute("href", mockPost.permalink);
    });
  });
});
