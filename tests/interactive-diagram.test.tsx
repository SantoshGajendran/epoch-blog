import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import gsap from "gsap";
import {
  InteractiveDiagram,
  agentLoopSteps,
  type DiagramStep,
} from "@/components/post/interactive-diagram";
import { DiagramSlot } from "@/components/post/diagram-slot";
import { MDXContent } from "@/components/post/mdx-content";
import { SoundProvider } from "@/lib/audio/sound-provider";
import { soundEffects } from "@/lib/audio/sound-effects";
import { siteConfig } from "@config/index";

describe("InteractiveDiagram Component", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let prefersReducedMotion = false;

  beforeEach(() => {
    prefersReducedMotion = false;
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? prefersReducedMotion : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock as unknown as typeof window.matchMedia;
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial Rendering and Stepper", () => {
    it("renders with default agentLoopSteps on step 1 with counter and details", () => {
      render(<InteractiveDiagram />);

      const counterText = `${siteConfig.ui.diagramStepPrefix} 1 ${siteConfig.ui.diagramOfPrefix} ${agentLoopSteps.length}`;
      expect(screen.getByText(counterText)).toBeInTheDocument();

      expect(
        screen.getByRole("heading", { name: agentLoopSteps[0].title })
      ).toBeInTheDocument();
      expect(screen.getByText(agentLoopSteps[0].summary)).toBeInTheDocument();
      expect(screen.getByText(agentLoopSteps[0].details)).toBeInTheDocument();

      const prevBtn = screen.getByRole("button", { name: siteConfig.ui.diagramPreviousStepLabel });
      const nextBtn = screen.getByRole("button", { name: siteConfig.ui.diagramNextStepLabel });

      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeEnabled();
    });

    it("renders custom steps, custom title, and custom description when provided", () => {
      const customSteps: DiagramStep[] = [
        {
          id: "step-a",
          title: "Custom Alpha",
          summary: "First custom phase summary",
          details: "Deep custom details for alpha",
          badge: "Alpha",
        },
        {
          id: "step-b",
          title: "Custom Beta",
          summary: "Second custom phase summary",
          details: "Deep custom details for beta",
          badge: "Beta",
        },
      ];

      render(
        <InteractiveDiagram
          steps={customSteps}
          title="Custom Pipeline"
          description="A custom pipeline description"
        />
      );

      expect(screen.getByText("Custom Pipeline")).toBeInTheDocument();
      expect(screen.getByText("A custom pipeline description")).toBeInTheDocument();
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 1 ${siteConfig.ui.diagramOfPrefix} 2`)
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Custom Alpha" })).toBeInTheDocument();
    });
  });

  describe("Step Navigation & Controls", () => {
    it("advances with Next button and rewinds with Previous button", () => {
      render(<InteractiveDiagram />);

      const prevBtn = screen.getByRole("button", { name: siteConfig.ui.diagramPreviousStepLabel });
      const nextBtn = screen.getByRole("button", { name: siteConfig.ui.diagramNextStepLabel });

      // Advance to step 2
      fireEvent.click(nextBtn);
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 2 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: agentLoopSteps[1].title })
      ).toBeInTheDocument();
      expect(prevBtn).toBeEnabled();
      expect(nextBtn).toBeEnabled();

      // Advance to step 3
      fireEvent.click(nextBtn);
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 3 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();

      // Advance to step 4 (last step)
      fireEvent.click(nextBtn);
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 4 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();
      expect(nextBtn).toBeDisabled();

      // Rewind to step 3
      fireEvent.click(prevBtn);
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 3 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();
      expect(nextBtn).toBeEnabled();
    });

    it("navigates directly when clicking step pills", () => {
      render(<InteractiveDiagram />);

      // All pills should exist
      const pills = screen.getAllByRole("button", {
        name: new RegExp(`${siteConfig.ui.diagramStepPrefix} \\d+`),
      });
      expect(pills).toHaveLength(agentLoopSteps.length);

      expect(pills[0]).toHaveAttribute("aria-pressed", "true");
      expect(pills[2]).toHaveAttribute("aria-pressed", "false");

      // Click pill for step 3
      fireEvent.click(pills[2]);
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 3 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: agentLoopSteps[2].title })
      ).toBeInTheDocument();
      expect(pills[2]).toHaveAttribute("aria-pressed", "true");
      expect(pills[0]).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("Accessibility & Keyboard Controls", () => {
    it("renders focusable region with accessible role and label", () => {
      render(<InteractiveDiagram title="Agent Trajectory Engine" />);
      const region = screen.getByRole("region", { name: "Agent Trajectory Engine" });
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute("tabIndex", "0");
    });

    it("uses default diagram label for aria-label when title is omitted", () => {
      render(<InteractiveDiagram />);
      const region = screen.getByRole("region", {
        name: siteConfig.ui.diagramHeaderLabel || "Interactive diagram",
      });
      expect(region).toBeInTheDocument();
    });

    it("navigates steps with ArrowRight and ArrowLeft keyboard keys", () => {
      render(<InteractiveDiagram />);
      const region = screen.getByRole("region", {
        name: siteConfig.ui.diagramHeaderLabel || "Interactive diagram",
      });

      // ArrowRight advances to step 2
      fireEvent.keyDown(region, { key: "ArrowRight" });
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 2 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();

      // ArrowRight advances to step 3
      fireEvent.keyDown(region, { key: "ArrowRight" });
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 3 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();

      // ArrowLeft goes back to step 2
      fireEvent.keyDown(region, { key: "ArrowLeft" });
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 2 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();

      // ArrowLeft to step 1
      fireEvent.keyDown(region, { key: "ArrowLeft" });
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 1 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();

      // ArrowLeft at step 1 does not decrement past 1
      fireEvent.keyDown(region, { key: "ArrowLeft" });
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 1 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();
    });

    it("announces step changes via ARIA live region", () => {
      render(<InteractiveDiagram />);

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
      expect(liveRegion).toHaveTextContent(
        `${siteConfig.ui.diagramStepPrefix} 1 ${siteConfig.ui.diagramOfPrefix} 4: ${agentLoopSteps[0].title}`
      );

      const nextBtn = screen.getByRole("button", { name: siteConfig.ui.diagramNextStepLabel });
      fireEvent.click(nextBtn);

      expect(liveRegion).toHaveTextContent(
        `${siteConfig.ui.diagramStepPrefix} 2 ${siteConfig.ui.diagramOfPrefix} 4: ${agentLoopSteps[1].title}`
      );
    });
  });

  describe("Animation & Reduced Motion", () => {
    it("calls GSAP animation when reduced motion is false", () => {
      const gsapFromToSpy = vi.spyOn(gsap, "fromTo");
      render(<InteractiveDiagram />);

      const nextBtn = screen.getByRole("button", { name: siteConfig.ui.diagramNextStepLabel });
      fireEvent.click(nextBtn);

      expect(gsapFromToSpy).toHaveBeenCalled();
    });

    it("skips GSAP animation when prefers-reduced-motion is true", () => {
      prefersReducedMotion = true;
      const gsapFromToSpy = vi.spyOn(gsap, "fromTo");
      render(<InteractiveDiagram />);

      const nextBtn = screen.getByRole("button", { name: siteConfig.ui.diagramNextStepLabel });
      fireEvent.click(nextBtn);

      // Animation must be skipped when reduced motion is preferred
      expect(gsapFromToSpy).not.toHaveBeenCalled();
    });
  });

  describe("Audio Feedback", () => {
    it("plays tick sound on step navigation when sound is enabled", () => {
      const playTickSpy = vi.spyOn(soundEffects, "playActionTick").mockImplementation(() => {});

      // Set sound enabled in localStorage before render
      localStorage.setItem("epoch_sound_enabled", "true");

      render(
        <SoundProvider>
          <InteractiveDiagram />
        </SoundProvider>
      );

      const nextBtn = screen.getByRole("button", { name: siteConfig.ui.diagramNextStepLabel });
      fireEvent.click(nextBtn);

      expect(playTickSpy).toHaveBeenCalledTimes(1);
    });

    it("does not play tick sound when sound is muted", () => {
      const playTickSpy = vi.spyOn(soundEffects, "playActionTick").mockImplementation(() => {});

      localStorage.setItem("epoch_sound_enabled", "false");

      render(
        <SoundProvider>
          <InteractiveDiagram />
        </SoundProvider>
      );

      const nextBtn = screen.getByRole("button", { name: siteConfig.ui.diagramNextStepLabel });
      fireEvent.click(nextBtn);

      expect(playTickSpy).not.toHaveBeenCalled();
    });
  });

  describe("DiagramSlot Integration", () => {
    it("renders InteractiveDiagram when name is 'agent-loop-trajectory' and children are omitted", () => {
      render(
        <DiagramSlot
          name="agent-loop-trajectory"
          title="Agent Tool Loop Architecture"
          description="Autonomous cycle of intent, actuation, and evaluation."
        />
      );

      // Title & description in DiagramSlot header
      expect(screen.getByText("Agent Tool Loop Architecture")).toBeInTheDocument();
      expect(
        screen.getByText("Autonomous cycle of intent, actuation, and evaluation.")
      ).toBeInTheDocument();

      // Interactive diagram rendered inside
      const counterText = `${siteConfig.ui.diagramStepPrefix} 1 ${siteConfig.ui.diagramOfPrefix} 4`;
      expect(screen.getByText(counterText)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: agentLoopSteps[0].title })
      ).toBeInTheDocument();
    });

    it("renders placeholder slot when name is not 'agent-loop-trajectory' and no children provided", () => {
      render(<DiagramSlot name="neural-activation-flow" title="Neural Flow" />);
      expect(screen.getByText("[Interactive Component Slot: neural-activation-flow]")).toBeInTheDocument();
    });

    it("renders custom children even if name is 'agent-loop-trajectory'", () => {
      render(
        <DiagramSlot name="agent-loop-trajectory" title="Custom Override">
          <div data-testid="custom-child-override">Custom Implementation</div>
        </DiagramSlot>
      );
      expect(screen.getByTestId("custom-child-override")).toBeInTheDocument();
      expect(screen.queryByText(`${siteConfig.ui.diagramStepPrefix} 1`)).not.toBeInTheDocument();
    });
  });

  describe("MDXContent Integration", () => {
    it("makes InteractiveDiagram available inside MDXContent", () => {
      const mockCode =
        'const {jsx: _jsx} = arguments[0]; return { default: (props) => _jsx(props.components.InteractiveDiagram, { title: "MDX Diagram" }) };';
      render(<MDXContent code={mockCode} />);
      expect(screen.getByText("MDX Diagram")).toBeInTheDocument();
      expect(
        screen.getByText(`${siteConfig.ui.diagramStepPrefix} 1 ${siteConfig.ui.diagramOfPrefix} 4`)
      ).toBeInTheDocument();
    });
  });
});
