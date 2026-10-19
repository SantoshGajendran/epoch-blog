"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { siteConfig } from "@config/index";
import { useOptionalSound } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { CyberBackground } from "@/components/ambient/cyber-background";
import { LearningStatsBar } from "./learning-stats-bar";
import { BadgeFilterBar } from "./badge-filter-bar";
import { LearningPathCard } from "./learning-path-card";
import { SeriesRoadmapView } from "./series-roadmap-view";
import { TipCard } from "./tip-card";
import {
  getCompletedSteps,
  toggleStepCompletion,
} from "@/lib/learn/progress-storage";
import type { Post, Series, Path, Tip } from "@/lib/content";

export type LearnTab = "paths" | "series" | "tips";

export interface LearnHubViewProps {
  posts: Post[];
  series: Series[];
  paths: Path[];
  tips: Tip[];
  initialTab?: LearnTab;
  className?: string;
}

const TABS: Array<{ id: LearnTab; label: string }> = [
  { id: "paths", label: siteConfig.ui.tabPathsLabel },
  { id: "series", label: siteConfig.ui.tabSeriesLabel },
  { id: "tips", label: siteConfig.ui.tabTipsLabel },
];

const DEFAULT_BADGES = ["LLM", "RAG", "Tuning", "Setup", "Infra", "Agents"];

function useSafeSearchParams(): URLSearchParams {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSearchParams() || new URLSearchParams();
  } catch {
    return new URLSearchParams();
  }
}

function useSafeRouter() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRouter();
  } catch {
    return null;
  }
}

export function LearnHubView({
  posts,
  series,
  paths,
  tips,
  initialTab = "paths",
  className,
}: LearnHubViewProps) {
  const sound = useOptionalSound();
  const searchParams = useSafeSearchParams();
  const router = useSafeRouter();

  // Resolve initial tab: search param ?tab= takes priority if valid
  const urlTab = searchParams.get("tab") as LearnTab | null;
  const resolvedInitialTab: LearnTab =
    urlTab === "paths" || urlTab === "series" || urlTab === "tips"
      ? urlTab
      : initialTab;

  const [activeTab, setActiveTab] = useState<LearnTab>(resolvedInitialTab);
  const [activeBadges, setActiveBadges] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Initialize and subscribe to progress changes
  useEffect(() => {
    setCompletedSteps(getCompletedSteps());

    const handleProgressChange = () => {
      setCompletedSteps(getCompletedSteps());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("epoch:progress-change", handleProgressChange);
      return () => {
        window.removeEventListener("epoch:progress-change", handleProgressChange);
      };
    }
  }, []);

  // Compute available badges
  const availableBadges = useMemo(() => {
    const set = new Set<string>(DEFAULT_BADGES);
    for (const p of paths) {
      if (p.badge) set.add(p.badge);
    }
    for (const t of tips) {
      for (const b of t.badges || []) {
        set.add(b);
      }
    }
    return Array.from(set);
  }, [paths, tips]);

  // Compute telemetry metrics
  const totalMilestones = useMemo(() => {
    return paths.reduce((acc, p) => acc + (p.steps?.length ?? 0), 0);
  }, [paths]);

  const completedMilestones = useMemo(() => {
    let count = 0;
    for (const p of paths) {
      for (const s of p.steps || []) {
        if (completedSteps.has(`${p.id}:${s.id}`)) {
          count++;
        }
      }
    }
    return count;
  }, [paths, completedSteps]);

  // Tab switching handler
  const handleTabChange = useCallback(
    (tabId: LearnTab) => {
      if (tabId !== activeTab) {
        sound?.playSound("tick");
        setActiveTab(tabId);
        if (router) {
          const url = new URL(window.location.href);
          url.searchParams.set("tab", tabId);
          window.history.replaceState(null, "", url.toString());
        }
      }
    },
    [activeTab, sound, router]
  );

  // Tab keyboard navigation (WAI-ARIA Left / Right Arrow navigation)
  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = TABS.length - 1;
    } else {
      return;
    }

    const nextTab = TABS[nextIndex];
    handleTabChange(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  };

  // Badge toggling
  const handleToggleBadge = useCallback((badge: string) => {
    setActiveBadges((prev) => {
      const next = new Set(prev);
      if (next.has(badge)) {
        next.delete(badge);
      } else {
        next.add(badge);
      }
      return next;
    });
  }, []);

  const handleClearBadges = useCallback(() => {
    setActiveBadges(new Set());
  }, []);

  // Compute badge counts and filtered lists based on active tab
  const { filteredPaths, filteredTips, itemCounts } = useMemo(() => {
    const counts: Record<string, number> = {
      [siteConfig.ui.filterAllLabel]:
        activeTab === "paths"
          ? paths.length
          : activeTab === "tips"
          ? tips.length
          : 0,
      All:
        activeTab === "paths"
          ? paths.length
          : activeTab === "tips"
          ? tips.length
          : 0,
    };

    for (const badge of availableBadges) {
      if (activeTab === "paths") {
        counts[badge] = paths.filter((p) => p.badge === badge).length;
      } else if (activeTab === "tips") {
        counts[badge] = tips.filter((t) => t.badges?.includes(badge)).length;
      } else {
        counts[badge] = 0;
      }
    }

    const fPaths =
      activeBadges.size === 0
        ? paths
        : paths.filter((p) => activeBadges.has(p.badge));

    const fTips =
      activeBadges.size === 0
        ? tips
        : tips.filter((t) => t.badges?.some((b) => activeBadges.has(b)));

    return {
      filteredPaths: fPaths,
      filteredTips: fTips,
      itemCounts: counts,
    };
  }, [activeTab, activeBadges, paths, tips, availableBadges]);

  const handleToggleStep = useCallback((stepKey: string) => {
    toggleStepCompletion(stepKey);
    setCompletedSteps(getCompletedSteps());
  }, []);

  const isStepDone = useCallback(
    (stepKey: string) => {
      return completedSteps.has(stepKey);
    },
    [completedSteps]
  );

  return (
    <div
      className={cn(
        "relative min-h-[calc(100vh-3.5rem)] py-8 px-4 sm:px-6 lg:px-8",
        className
      )}
    >
      <CyberBackground />

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink font-sans">
            {siteConfig.ui.learnHubTitle}
          </h1>
          <p className="mt-2 text-base text-mut leading-relaxed max-w-3xl">
            {siteConfig.ui.learnHubTagline}
          </p>
        </div>

        {/* Telemetry Stats Ticker */}
        <LearningStatsBar
          completedMilestones={completedMilestones}
          totalMilestones={totalMilestones}
          activeTracks={paths.length}
          totalTips={tips.length}
        />

        {/* Tab Controls & Filter Bar */}
        <div className="space-y-4">
          <div
            role="tablist"
            aria-label={siteConfig.ui.learnHubTitle}
            className="flex items-center gap-1.5 p-1 rounded-xl bg-surf/80 border border-line/60 backdrop-blur-md w-full sm:w-fit"
          >
            {TABS.map((tab, index) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-controls={`panel-${tab.id}`}
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={cn(
                    "flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-1",
                    isSelected
                      ? "bg-lime text-limeink font-semibold border-lime shadow-sm"
                      : "border-transparent text-mut hover:text-ink hover:bg-surf/60"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filter Bar (for Paths and Tips tabs) */}
          {activeTab !== "series" && (
            <BadgeFilterBar
              availableBadges={availableBadges}
              activeBadges={activeBadges}
              onToggleBadge={handleToggleBadge}
              onClear={handleClearBadges}
              itemCounts={itemCounts}
            />
          )}
        </div>

        {/* Tab Panels */}
        {/* 1. Learning Paths View */}
        <div
          role="tabpanel"
          id="panel-paths"
          aria-labelledby="tab-paths"
          hidden={activeTab !== "paths"}
        >
          {activeTab === "paths" && (
            <>
              {filteredPaths.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-line/60 bg-surf/50 text-mut">
                  <p className="text-sm">{siteConfig.ui.noSearchResultsLabel}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredPaths.map((path) => (
                    <LearningPathCard
                      key={path.id}
                      path={path}
                      onToggleStep={handleToggleStep}
                      isCompleted={isStepDone}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 2. Series Roadmaps View */}
        <div
          role="tabpanel"
          id="panel-series"
          aria-labelledby="tab-series"
          hidden={activeTab !== "series"}
        >
          {activeTab === "series" && (
            <SeriesRoadmapView seriesList={series} posts={posts} />
          )}
        </div>

        {/* 3. Tips & Tricks View */}
        <div
          role="tabpanel"
          id="panel-tips"
          aria-labelledby="tab-tips"
          hidden={activeTab !== "tips"}
        >
          {activeTab === "tips" && (
            <>
              {filteredTips.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-line/60 bg-surf/50 text-mut">
                  <p className="text-sm">{siteConfig.ui.noSearchResultsLabel}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTips.map((tip) => (
                    <TipCard key={tip.id} tip={tip} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
