"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { useOptionalSound } from "@/lib/audio";
import { siteConfig } from "@config/index";

export interface DiagramStep {
  id: string;
  title: string;
  summary: string;
  details: string;
  badge?: string;
}

export interface InteractiveDiagramProps {
  steps?: DiagramStep[];
  title?: string;
  description?: string;
  className?: string;
}

export const agentLoopSteps: DiagramStep[] = [
  {
    id: "planning",
    title: "Intent & planning",
    summary: "Model evaluates input, checks history, and formulates tool execution strategy.",
    details:
      "The system inspects conversational context, agent memory, and prompt specifications. It projects potential multi-step paths before emitting function call definitions.",
    badge: "01",
  },
  {
    id: "actuation",
    title: "Tool actuation",
    summary: "Arguments serialized into JSON schema; safety policy boundary checked.",
    details:
      "Synthesizes typed arguments strictly adhering to JSON schemas. Passes through deterministic policy interceptors and schema validators prior to dispatch.",
    badge: "02",
  },
  {
    id: "sandbox",
    title: "Sandbox execution",
    summary: "Tool executed in isolated environment; telemetry and latency captured.",
    details:
      "Isolated execution runtime executes network/compute operations with stringent capability bounding, resource budgeting, and trace capture.",
    badge: "03",
  },
  {
    id: "evaluation",
    title: "Trajectory evaluation",
    summary: "Environment observation returned; evaluator calculates goal divergence.",
    details:
      "Output observations parse back into trajectory memory. Convergence metrics evaluate task completion or trigger recursive corrective loops.",
    badge: "04",
  },
];

export function InteractiveDiagram({
  steps = agentLoopSteps,
  title,
  description,
  className,
}: InteractiveDiagramProps) {
  const [currentStep, setCurrentStep] = React.useState<number>(0);
  const detailsCardRef = React.useRef<HTMLDivElement>(null);
  const sound = useOptionalSound();

  const activeStep = steps[currentStep] || steps[0];

  const goToStep = React.useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, steps.length - 1));
      if (clamped === currentStep) return;

      setCurrentStep(clamped);
      if (sound?.isSoundEnabled) {
        sound.playSound("tick");
      }
    },
    [currentStep, steps.length, sound]
  );

  const handleNext = React.useCallback(() => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, steps.length, goToStep]);

  const handlePrev = React.useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    },
    [handleNext, handlePrev]
  );

  React.useEffect(() => {
    if (!detailsCardRef.current) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      gsap.set(detailsCardRef.current, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      detailsCardRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
    );
  }, [currentStep]);

  const ariaRegionLabel = title || siteConfig.ui.diagramHeaderLabel || "Interactive diagram";

  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={ariaRegionLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative flex flex-col gap-6 rounded-xl border border-line bg-surf/40 p-5 sm:p-6 backdrop-blur-sm outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        className
      )}
    >
      {/* Optional Title & Description Header */}
      {(title || description) && (
        <div className="flex flex-col gap-1 border-b border-line/40 pb-4">
          {title && <h3 className="text-base font-semibold text-ink sm:text-lg">{title}</h3>}
          {description && <p className="text-xs text-mut sm:text-sm">{description}</p>}
        </div>
      )}

      {/* Stepper Toolbar: Counter badge, Step Pill Buttons, and Prev/Next Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-md border border-line/80 bg-surf px-2.5 py-1 font-mono text-xs font-semibold text-ink">
            {siteConfig.ui.diagramStepPrefix} {currentStep + 1} {siteConfig.ui.diagramOfPrefix}{" "}
            {steps.length}
          </span>
          <div className="flex items-center gap-1.5" role="group" aria-label="Step selection">
            {steps.map((step, index) => {
              const isCurrent = index === currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(index)}
                  aria-pressed={isCurrent}
                  aria-label={`${siteConfig.ui.diagramStepPrefix} ${index + 1}: ${step.title}`}
                  className={cn(
                    "flex h-7 min-w-7 items-center justify-center rounded-md border px-2 font-mono text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime",
                    isCurrent
                      ? "border-lime/60 bg-lime/15 font-bold text-lime shadow-sm"
                      : index < currentStep
                      ? "border-line bg-surf/80 text-ink/75 hover:border-lime/40 hover:text-ink"
                      : "border-line/40 bg-bg/50 text-mut hover:border-line hover:text-ink/80"
                  )}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stepper Next / Prev Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            aria-label={siteConfig.ui.diagramPreviousStepLabel}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-line bg-surf px-3 py-1.5 font-mono text-xs font-medium text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime",
              currentStep === 0
                ? "cursor-not-allowed opacity-40"
                : "hover:border-lime/50 hover:bg-lime/10 hover:text-lime"
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{siteConfig.ui.diagramPreviousStepLabel}</span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
            aria-label={siteConfig.ui.diagramNextStepLabel}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-line bg-surf px-3 py-1.5 font-mono text-xs font-medium text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime",
              currentStep === steps.length - 1
                ? "cursor-not-allowed opacity-40"
                : "hover:border-lime/50 hover:bg-lime/10 hover:text-lime"
            )}
          >
            <span className="hidden sm:inline">{siteConfig.ui.diagramNextStepLabel}</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Visual Architecture Nodes Diagram */}
      <div className="relative overflow-x-auto py-2">
        <div className="flex min-w-[500px] items-center justify-between gap-2 px-2 sm:px-4">
          {steps.map((step, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => goToStep(idx)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime",
                    isActive
                      ? "border-lime bg-lime/10 shadow-[0_0_15px_rgba(200,255,0,0.15)] ring-1 ring-lime/40"
                      : isCompleted
                      ? "border-line bg-surf/80 hover:border-lime/40"
                      : "border-line/40 bg-bg/40 opacity-70 hover:opacity-100"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                        isActive
                          ? "bg-lime text-black"
                          : isCompleted
                          ? "bg-line text-ink"
                          : "bg-bg text-mut"
                      )}
                    >
                      {idx + 1}
                    </span>
                    {step.badge && (
                      <span className="text-[10px] uppercase tracking-wider text-mut">
                        {step.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold leading-tight",
                      isActive ? "text-lime" : isCompleted ? "text-ink" : "text-mut"
                    )}
                  >
                    {step.title}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-4 shrink-0 transition-colors duration-200",
                      idx < currentStep ? "bg-lime/60" : "bg-line/40"
                    )}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detail Card with GSAP Transition */}
      <div
        ref={detailsCardRef}
        className="rounded-lg border border-line/80 bg-bg/80 p-5 shadow-inner backdrop-blur-sm"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-ink sm:text-base">{activeStep.title}</h4>
            {activeStep.badge && (
              <span className="rounded border border-line bg-surf px-2 py-0.5 font-mono text-[10px] text-mut">
                {activeStep.badge}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-ink/90 sm:text-sm">{activeStep.summary}</p>
          <p className="text-xs leading-relaxed text-mut sm:text-sm">{activeStep.details}</p>
        </div>
      </div>

      {/* ARIA Live Region for Screen Reader Announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {siteConfig.ui.diagramStepPrefix} {currentStep + 1} {siteConfig.ui.diagramOfPrefix}{" "}
        {steps.length}: {activeStep.title} - {activeStep.summary}
      </div>
    </div>
  );
}
