import React from "react";
import { siteConfig } from "@config/index";
import { cn } from "@/lib/utils";

export interface LearningStatsBarProps {
  completedMilestones: number;
  totalMilestones: number;
  activeTracks: number;
  totalTips: number;
  className?: string;
}

/**
 * Cybernetic telemetry ticker displaying user learning progress,
 * active tracks, available engineering tips, and a mini percentage progress bar.
 */
export function LearningStatsBar({
  completedMilestones,
  totalMilestones,
  activeTracks,
  totalTips,
  className,
}: LearningStatsBarProps) {
  const percentage =
    totalMilestones > 0
      ? Math.min(100, Math.max(0, Math.round((completedMilestones / totalMilestones) * 100)))
      : 0;

  return (
    <div
      role="status"
      aria-live="off"
      className={cn(
        "flex flex-wrap items-center justify-between gap-y-3 gap-x-6 px-4 py-2.5 rounded-xl border border-line/60 bg-surf/70 backdrop-blur-md font-mono text-xs uppercase tracking-wider text-mut shadow-sm",
        className
      )}
    >
      {/* Beacon & Title */}
      <div className="flex items-center gap-2">
        <span
          data-testid="learning-beacon"
          className="w-2 h-2 rounded-full bg-lime shadow-[0_0_8px_rgba(163,230,53,0.8)] animate-pulse shrink-0"
          aria-hidden="true"
        />
        <span className="font-semibold text-ink">
          {siteConfig.ui.learnHubTitle}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Completed Milestones */}
        <div className="inline-flex items-center gap-1.5">
          <span className="text-mut">{siteConfig.ui.progressCompletedLabel}:</span>
          <strong className="font-semibold text-ink">
            {completedMilestones}/{totalMilestones}
          </strong>
          <span className="text-mut">{siteConfig.ui.milestonesLabel}</span>
          <span className="text-lime font-semibold">{percentage}%</span>
        </div>

        {/* Mini Progress Bar */}
        <div
          className="w-20 sm:w-28 h-1.5 bg-line/40 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${siteConfig.ui.progressCompletedLabel} ${siteConfig.ui.milestonesLabel}`}
        >
          <div
            data-testid="learning-progress-fill"
            className="h-full bg-lime transition-all duration-300 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Active Tracks */}
        <div className="inline-flex items-center gap-1.5">
          <span className="text-mut">{siteConfig.ui.tabPathsLabel}:</span>
          <strong className="font-semibold text-ink">{activeTracks}</strong>
        </div>

        {/* Total Tips */}
        <div className="inline-flex items-center gap-1.5">
          <span className="text-mut">{siteConfig.ui.tabTipsLabel}:</span>
          <strong className="font-semibold text-ink">{totalTips}</strong>
        </div>
      </div>
    </div>
  );
}
