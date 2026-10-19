"use client";

import React from "react";
import { siteConfig } from "@config/index";
import { useOptionalSound } from "@/lib/audio/sound-provider";
import { cn } from "@/lib/utils";

export interface BadgeFilterBarProps {
  availableBadges: string[];
  activeBadges: Set<string>;
  onToggleBadge: (badge: string) => void;
  onClear: () => void;
  itemCounts?: Record<string, number>;
  className?: string;
}

/**
 * Interactive filter bar allowing users to filter roadmaps and tips by tech badges.
 * Supports multi-selection, sound feedback, count badges, and full keyboard accessibility.
 */
export function BadgeFilterBar({
  availableBadges,
  activeBadges,
  onToggleBadge,
  onClear,
  itemCounts,
  className,
}: BadgeFilterBarProps) {
  const sound = useOptionalSound();

  const handleClear = () => {
    sound?.playSound("tick");
    onClear();
  };

  const handleToggle = (badge: string) => {
    sound?.playSound("tick");
    onToggleBadge(badge);
  };

  const isAllActive = activeBadges.size === 0;
  const allCount = itemCounts
    ? (itemCounts[siteConfig.ui.filterAllLabel] ?? itemCounts["All"])
    : undefined;

  return (
    <div
      role="group"
      aria-label="Filter by badge"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {/* "All" button */}
      <button
        type="button"
        aria-pressed={isAllActive}
        onClick={handleClear}
        className={cn(
          "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-colors cursor-pointer border",
          "focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-1",
          isAllActive
            ? "bg-lime text-limeink font-semibold border-lime shadow-sm"
            : "bg-surf text-mut hover:text-ink border-line hover:border-line/80 font-medium"
        )}
      >
        <span>{siteConfig.ui.filterAllLabel}</span>
        {allCount !== undefined && (
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none",
              isAllActive ? "bg-limeink/20 text-limeink font-semibold" : "bg-line/50 text-mut"
            )}
          >
            {allCount}
          </span>
        )}
      </button>

      {/* Individual badge buttons */}
      {availableBadges.map((badge) => {
        const isSelected = activeBadges.has(badge);
        const count = itemCounts ? itemCounts[badge] : undefined;

        return (
          <button
            key={badge}
            type="button"
            aria-pressed={isSelected}
            onClick={() => handleToggle(badge)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-colors cursor-pointer border",
              "focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-1",
              isSelected
                ? "bg-lime text-limeink font-semibold border-lime shadow-sm"
                : "bg-surf text-mut hover:text-ink border-line hover:border-line/80 font-medium"
            )}
          >
            <span>{badge}</span>
            {count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none",
                  isSelected ? "bg-limeink/20 text-limeink font-semibold" : "bg-line/50 text-mut"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
