"use client";

import React from "react";
import Link from "next/link";
import {
  Check,
  FileText,
  Code2,
  Activity,
  ExternalLink,
  Clock,
} from "lucide-react";
import { siteConfig } from "@config/index";
import { useOptionalSound } from "@/lib/audio/sound-provider";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";
import type { Path } from "@/lib/content";

export interface LearningPathCardProps {
  path: Path;
  onToggleStep: (stepKey: string) => void;
  isCompleted: (stepKey: string) => boolean;
  className?: string;
}

/**
 * Returns icon corresponding to milestone step type.
 */
function getStepTypeIcon(type: "article" | "code" | "benchmark") {
  switch (type) {
    case "article":
      return FileText;
    case "code":
      return Code2;
    case "benchmark":
      return Activity;
    default:
      return FileText;
  }
}

/**
 * Interactive milestone circuit roadmap component representing a structured
 * AI systems engineering learning path with milestone checkboxes and progress tracker.
 */
export function LearningPathCard({
  path,
  onToggleStep,
  isCompleted,
  className,
}: LearningPathCardProps) {
  const sound = useOptionalSound();

  const totalSteps = path.steps?.length ?? 0;
  const completedCount = totalSteps > 0
    ? path.steps.filter((s) => isCompleted(`${path.id}:${s.id}`)).length
    : 0;

  const percentage = totalSteps > 0
    ? Math.min(100, Math.max(0, Math.round((completedCount / totalSteps) * 100)))
    : 0;

  return (
    <SpotlightCard
      className={cn(
        "p-6 rounded-xl border border-line/60 bg-surf/80 backdrop-blur-md shadow-sm transition-all hover:border-lime/40 flex flex-col justify-between",
        className
      )}
    >
      <div>
        {/* Header: Badge, Level, Time */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {path.badge && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-line bg-surf/90 text-mut">
                {path.badge}
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[11px] font-mono text-mut border border-line/50 bg-ink/5 dark:bg-white/5">
              {path.level}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 text-xs font-mono text-mut">
            <Clock className="w-3.5 h-3.5 text-mut" aria-hidden="true" />
            <span>{path.estimatedHours}h</span>
          </div>
        </div>

        {/* Title & Summary */}
        <h3 className="font-semibold text-ink text-lg tracking-tight mb-2">
          {path.title}
        </h3>
        <p className="text-sm text-mut mb-5 leading-relaxed">
          {path.summary}
        </p>

        {/* Progress Bar & Readout */}
        <div className="mb-6 rounded-lg border border-line/40 bg-ink/5 dark:bg-black/30 p-3">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-mut">
              {completedCount}/{totalSteps} {siteConfig.ui.progressCompletedLabel}
            </span>
            <span className="font-semibold text-lime">{percentage}%</span>
          </div>

          <div
            className="w-full h-1.5 bg-line/40 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${path.title} ${siteConfig.ui.progressCompletedLabel}`}
          >
            <div
              className="h-full bg-lime transition-all duration-300 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Milestones Circuit Roadmap */}
        {totalSteps > 0 && (
          <div className="relative">
            {/* Vertical circuit line connecting milestone nodes */}
            <div
              className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-line/60 pointer-events-none"
              aria-hidden="true"
            />

            <ol className="relative space-y-4">
              {path.steps.map((step) => {
                const stepKey = `${path.id}:${step.id}`;
                const completed = isCompleted(stepKey);
                const StepIcon = getStepTypeIcon(step.type);

                return (
                  <li
                    key={step.id}
                    className="relative flex items-start gap-3.5 group/step"
                  >
                    {/* Checkbox button node */}
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={completed}
                      aria-label={step.title}
                      onClick={() => {
                        sound?.playSound("tick");
                        onToggleStep(stepKey);
                      }}
                      className={cn(
                        "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime",
                        completed
                          ? "bg-lime text-limeink border-lime shadow-sm"
                          : "bg-surf border-line text-mut hover:border-lime/60"
                      )}
                    >
                      {completed ? (
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-mut/40 group-hover/step:bg-lime/60 transition-colors" />
                      )}
                    </button>

                    {/* Step details */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {step.postSlug ? (
                          <Link
                            href={`/posts/${step.postSlug}`}
                            className="text-sm font-medium text-ink hover:text-lime transition-colors"
                          >
                            {step.title}
                          </Link>
                        ) : step.externalUrl ? (
                          <a
                            href={step.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-ink hover:text-lime inline-flex items-center gap-1 transition-colors"
                          >
                            <span>{step.title}</span>
                            <ExternalLink
                              className="w-3.5 h-3.5 text-mut hover:text-lime shrink-0"
                              aria-hidden="true"
                            />
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-ink">
                            {step.title}
                          </span>
                        )}

                        {/* Step Type Badge */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-mut px-1.5 py-0.5 rounded border border-line/40 bg-ink/5 dark:bg-white/5">
                          <StepIcon className="w-3 h-3 text-mut" aria-hidden="true" />
                          <span>{step.type}</span>
                        </span>
                      </div>

                      <p className="text-xs text-mut leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
