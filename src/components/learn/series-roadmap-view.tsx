"use client";

import React from "react";
import Link from "next/link";
import { Layers, Clock } from "lucide-react";
import { siteConfig } from "@config/index";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";
import type { Series, Post } from "@/lib/content";

export interface SeriesRoadmapViewProps {
  seriesList: Series[];
  posts: Post[];
  className?: string;
}

/**
 * Multi-part series roadmaps view presenting comprehensive engineering series
 * with chronological circuit chapters, part badges, and reading time telemetry.
 */
export function SeriesRoadmapView({
  seriesList,
  posts,
  className,
}: SeriesRoadmapViewProps) {
  if (!seriesList || seriesList.length === 0) {
    return (
      <div
        className={cn(
          "p-8 text-center rounded-xl border border-line/60 bg-surf/50 text-mut",
          className
        )}
      >
        <p className="text-sm">{siteConfig.ui.noSearchResultsLabel}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {seriesList.map((series) => {
        const seriesPosts = posts
          .filter((p) => p.series?.id === series.id)
          .sort((a, b) => (a.series?.order ?? 0) - (b.series?.order ?? 0));

        return (
          <SpotlightCard
            key={series.id}
            className="p-6 rounded-xl border border-line/60 bg-surf/80 backdrop-blur-md shadow-sm transition-all hover:border-lime/40"
          >
            {/* Series Header */}
            <div className="mb-5 pb-4 border-b border-line/40">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-lime" aria-hidden="true" />
                <h3 className="font-semibold text-ink text-lg tracking-tight">
                  {series.title}
                </h3>
              </div>
              <p className="text-sm text-mut leading-relaxed">
                {series.summary}
              </p>
            </div>

            {/* Chapters Roadmap */}
            {seriesPosts.length === 0 ? (
              <p className="text-sm text-mut py-2">
                {siteConfig.ui.noSearchResultsLabel}
              </p>
            ) : (
              <div className="relative">
                {/* Connecting circuit track */}
                <div
                  className="absolute left-4 top-3 bottom-3 w-0.5 bg-line/60 pointer-events-none"
                  aria-hidden="true"
                />

                <ol className="relative space-y-3">
                  {seriesPosts.map((post, index) => {
                    const partNumber = post.series?.order ?? index + 1;

                    return (
                      <li
                        key={post.slug}
                        className="relative flex items-center justify-between gap-4 p-3 rounded-lg border border-line/50 bg-surf/60 hover:border-lime/40 transition-colors group/chapter"
                      >
                        {/* Part Badge & Title */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="relative z-10 px-2 py-0.5 rounded text-[11px] font-mono text-lime border border-lime/30 bg-lime/10 shrink-0 font-medium">
                            {siteConfig.ui.seriesPartPrefix} {partNumber}
                          </span>
                          <Link
                            href={post.permalink}
                            className="text-sm font-medium text-ink group-hover/chapter:text-lime transition-colors truncate"
                          >
                            {post.title}
                          </Link>
                        </div>

                        {/* Reading Time */}
                        <div className="flex items-center gap-1.5 text-xs font-mono text-mut shrink-0">
                          <Clock className="w-3.5 h-3.5 text-mut" aria-hidden="true" />
                          <span>
                            {post.readingTime} {siteConfig.ui.minReadSuffix}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </SpotlightCard>
        );
      })}
    </div>
  );
}
