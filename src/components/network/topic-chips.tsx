import React from "react";
import { siteConfig } from "@config/index";
import type { Topic } from "@config/schemas/topics";
import { cn } from "@/lib/utils";

export interface TopicChipsProps {
  topics: Topic[];
  activeTopicId: string | null;
  onSelectTopic: (id: string | null) => void;
  viewMode: "map" | "list";
  onViewModeChange: (mode: "map" | "list") => void;
  dimensionMode?: "2d" | "3d";
  onDimensionModeChange?: (mode: "2d" | "3d") => void;
  className?: string;
}

/**
 * Interactive topic filter pills and segmented map/list view mode switch.
 * Fully keyboard accessible with aria-pressed toggle states and responsive flex wrapping.
 */
export function TopicChips({
  topics,
  activeTopicId,
  onSelectTopic,
  viewMode,
  onViewModeChange,
  dimensionMode = "2d",
  onDimensionModeChange,
  className,
}: TopicChipsProps) {
  return (
    <div
      role="group"
      aria-label="Filter topics and view mode"
      className={cn("flex flex-wrap items-center gap-2 my-6", className)}
    >
      {/* "All topics" pill */}
      <button
        type="button"
        aria-pressed={activeTopicId === null}
        onClick={() => onSelectTopic(null)}
        className={cn(
          "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-lime",
          activeTopicId === null
            ? "bg-ink text-bg border-ink shadow-sm"
            : "bg-surf text-mut hover:text-ink border-line hover:border-line/80"
        )}
      >
        {siteConfig.ui.allTopicsLabel}
      </button>

      {/* Individual topic pills */}
      {topics.map((topic) => {
        const isSelected = activeTopicId === topic.id;
        return (
          <button
            key={topic.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectTopic(topic.id)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-lime",
              isSelected
                ? "bg-ink text-bg border-ink shadow-sm"
                : "bg-surf text-mut hover:text-ink border-line hover:border-line/80"
            )}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: `var(${topic.colorToken})` }}
              aria-hidden="true"
            />
            <span>{topic.label}</span>
          </button>
        );
      })}

      <div className="flex items-center gap-2 ml-auto max-sm:w-full max-sm:justify-between max-sm:mt-2">
        {/* Segmented control 2D / 3D toggle (visible only in map view on desktop/tablet) */}
        {viewMode === "map" && onDimensionModeChange && (
          <div
            role="group"
            aria-label="Dimension mode"
            className="hidden md:inline-flex items-center border border-line rounded-xl overflow-hidden bg-surf"
          >
            <button
              type="button"
              aria-pressed={dimensionMode === "2d"}
              onClick={() => onDimensionModeChange("2d")}
              className={cn(
                "px-3.5 py-1.5 text-sm transition-colors text-center",
                "focus:outline-none focus:ring-2 focus:ring-lime focus:ring-inset",
                dimensionMode === "2d"
                  ? "bg-lime text-limeink font-medium"
                  : "text-mut hover:text-ink hover:bg-line/20"
              )}
            >
              {siteConfig.ui.viewMode2dLabel}
            </button>
            <button
              type="button"
              aria-pressed={dimensionMode === "3d"}
              onClick={() => onDimensionModeChange("3d")}
              className={cn(
                "px-3.5 py-1.5 text-sm transition-colors text-center",
                "focus:outline-none focus:ring-2 focus:ring-lime focus:ring-inset",
                dimensionMode === "3d"
                  ? "bg-lime text-limeink font-medium"
                  : "text-mut hover:text-ink hover:bg-line/20"
              )}
            >
              {siteConfig.ui.viewMode3dLabel}
            </button>
          </div>
        )}

        {/* Segmented control Map / List toggle */}
        <div
          role="group"
          aria-label="View mode"
          className="flex items-center border border-line rounded-xl overflow-hidden bg-surf max-sm:w-full max-sm:justify-between"
        >
          <button
            type="button"
            aria-pressed={viewMode === "map"}
            onClick={() => onViewModeChange("map")}
            className={cn(
              "flex-1 sm:flex-none px-3.5 py-1.5 text-sm transition-colors text-center",
              "focus:outline-none focus:ring-2 focus:ring-lime focus:ring-inset",
              viewMode === "map"
                ? "bg-lime text-limeink font-medium"
                : "text-mut hover:text-ink hover:bg-line/20"
            )}
          >
            {siteConfig.ui.mapViewLabel}
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
            className={cn(
              "flex-1 sm:flex-none px-3.5 py-1.5 text-sm transition-colors text-center",
              "focus:outline-none focus:ring-2 focus:ring-lime focus:ring-inset",
              viewMode === "list"
                ? "bg-lime text-limeink font-medium"
                : "text-mut hover:text-ink hover:bg-line/20"
            )}
          >
            {siteConfig.ui.listViewLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
