import React from "react";
import Link from "next/link";
import { siteConfig, topicsConfig } from "@config/index";
import type { Post } from "@/lib/content";
import { cn } from "@/lib/utils";
import { SpotlightCard } from "@/components/ui/spotlight-card";

export interface PostListViewProps {
  posts: Post[];
  activeTopicId?: string | null;
  className?: string;
}

/**
 * Accessible list view alternative to the neural network map.
 * Fully semantic with <ul role="list"> and <li> elements.
 * Displays topic indicator dot, topic label, title, excerpt, and reading time.
 */
export function PostListView({
  posts,
  activeTopicId,
  className,
}: PostListViewProps) {
  const filteredPosts = activeTopicId
    ? posts.filter((p) => p.topic === activeTopicId)
    : posts;

  if (filteredPosts.length === 0) {
    return (
      <div
        className={cn(
          "border border-line rounded-2xl bg-surf p-12 text-center text-mut",
          className
        )}
      >
        <p className="text-base">{siteConfig.ui.noSearchResultsLabel}</p>
      </div>
    );
  }

  return (
    <ul
      role="list"
      className={cn(
        "border border-line rounded-2xl bg-surf overflow-hidden divide-y divide-line list-none m-0 p-0",
        className
      )}
    >
      {filteredPosts.map((post) => {
        const topic = topicsConfig.topics.find((t) => t.id === post.topic);
        const topicLabel = topic?.label ?? post.topic;
        const topicColorVar = topic?.colorToken
          ? `var(${topic.colorToken})`
          : "var(--a)";

        return (
          <li key={post.slug} className="m-0 p-0">
            <SpotlightCard
              data-testid="spotlight-card"
              className="h-full w-full"
            >
              <Link
                href={post.permalink}
                className={cn(
                  "group flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto] gap-3 sm:gap-5 items-start sm:items-center",
                  "p-4 sm:px-6 sm:py-5 transition-colors hover:bg-line/20",
                  "focus:outline-none focus:ring-2 focus:ring-lime focus:ring-inset"
                )}
              >
              {/* Dot indicator */}
              <div className="flex items-center shrink-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: topicColorVar }}
                  aria-hidden="true"
                />
              </div>

              {/* Title, topic badge and summary */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink text-base tracking-tight leading-snug group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <span className="inline-flex items-center text-xs font-medium text-mut px-2 py-0.5 rounded-full bg-line/40">
                    {topicLabel}
                  </span>
                </div>
                <p className="text-sm text-mut line-clamp-2 mt-1 leading-relaxed">
                  {post.summary}
                </p>
              </div>

              {/* Reading time */}
              <div className="shrink-0 text-xs sm:text-sm text-mut whitespace-nowrap">
                {post.readingTime} {siteConfig.ui.minReadSuffix}
              </div>
            </Link>
          </SpotlightCard>
        </li>
      );
      })}
    </ul>
  );
}
