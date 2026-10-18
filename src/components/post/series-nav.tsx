import * as React from "react";
import Link from "next/link";
import { Layers, ArrowLeft, ArrowRight } from "lucide-react";
import { getSeriesById } from "@/lib/content";
import { siteConfig } from "@config/index";
import { cn } from "@/lib/utils";

export interface SeriesNavProps {
  seriesId: string;
  currentSlug: string;
  className?: string;
}

export function SeriesNav({ seriesId, currentSlug, className }: SeriesNavProps) {
  const seriesData = getSeriesById(seriesId);
  if (!seriesData) return null;

  const { series, posts } = seriesData;
  const currentIndex = posts.findIndex((p) => p.slug === currentSlug);
  if (currentIndex === -1) return null;

  const currentOrder = currentIndex + 1;
  const totalParts = posts.length;
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const nextPost = currentIndex < totalParts - 1 ? posts[currentIndex + 1] : null;

  return (
    <aside
      aria-label="Series navigation"
      className={cn(
        "my-8 rounded-xl border border-line bg-surf p-5 text-sm",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-semibold text-ink">{series.title}</span>
        </div>
        <span className="text-xs font-mono text-mut">
          {siteConfig.ui.seriesPartPrefix} {currentOrder} {siteConfig.ui.seriesOfPrefix} {totalParts}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {prevPost ? (
          <Link
            href={prevPost.permalink}
            className="flex items-center gap-2.5 rounded-lg border border-line p-3 hover:border-primary/60 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 text-mut group-hover:text-primary shrink-0 transition-colors" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-mut">{siteConfig.ui.previousPostLabel}</div>
              <div className="text-xs font-medium text-ink truncate group-hover:text-primary transition-colors">
                {prevPost.title}
              </div>
            </div>
          </Link>
        ) : (
          <div aria-hidden="true" />
        )}

        {nextPost ? (
          <Link
            href={nextPost.permalink}
            className="flex items-center justify-between gap-2.5 rounded-lg border border-line p-3 hover:border-primary/60 transition-colors group sm:text-right"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono text-mut">{siteConfig.ui.nextPostLabel}</div>
              <div className="text-xs font-medium text-ink truncate group-hover:text-primary transition-colors">
                {nextPost.title}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-mut group-hover:text-primary shrink-0 transition-colors" aria-hidden="true" />
          </Link>
        ) : (
          <div aria-hidden="true" />
        )}
      </div>
    </aside>
  );
}
