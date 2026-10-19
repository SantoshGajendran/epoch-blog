import React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { siteConfig, topicsConfig } from "@config/index";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/content";
import { SpotlightCard } from "@/components/ui/spotlight-card";

export interface PostPreviewCardProps {
  post: Post;
  onClose: () => void;
  className?: string;
}

/**
 * Floating glassmorphism preview card positioned over the network map canvas.
 * Renders topic indicator, title, excerpt, reading time, and direct article link.
 */
export function PostPreviewCard({
  post,
  onClose,
  className,
}: PostPreviewCardProps) {
  const topic = topicsConfig.topics.find((t) => t.id === post.topic);
  const topicLabel = topic?.label ?? post.topic;
  const topicColorVar = topic?.colorToken ? `var(${topic.colorToken})` : "var(--a)";

  return (
    <SpotlightCard
      role="dialog"
      data-testid="post-preview-card"
      aria-labelledby="preview-card-title"
      className={cn(
        "absolute bottom-4 left-4 right-4 sm:left-6 sm:bottom-6 max-w-sm",
        "bg-surf/90 backdrop-blur-md border border-line rounded-xl p-4 shadow-xl z-20",
        "animate-in fade-in slide-in-from-bottom-2",
        className
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close post preview"
        className="absolute top-3 right-3 p-1 rounded-md text-mut hover:text-ink hover:bg-line/40 transition-colors focus:outline-none focus:ring-2 focus:ring-lime z-10"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Topic pill */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="w-2 h-2 rounded-full inline-block shrink-0"
          style={{ backgroundColor: topicColorVar }}
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-mut">{topicLabel}</span>
      </div>

      {/* Post title */}
      <h3
        id="preview-card-title"
        className="font-semibold text-ink text-base tracking-tight leading-snug line-clamp-2 my-1"
      >
        {post.title}
      </h3>

      {/* Summary */}
      <p className="text-sm text-mut line-clamp-2 mb-3">{post.summary}</p>

      {/* Reading time and metadata */}
      <div className="flex items-center gap-2 text-xs text-mut mb-3">
        <span>{post.date}</span>
        <span aria-hidden="true">•</span>
        <span>
          {post.readingTime} {siteConfig.ui.minReadSuffix}
        </span>
      </div>

      {/* Link to post */}
      <div>
        <Link
          href={post.permalink}
          className="inline-flex items-center text-sm font-medium text-ink underline decoration-lime decoration-2 underline-offset-4 hover:text-lime transition-colors"
        >
          {siteConfig.ui.readPostLabel}
        </Link>
      </div>
    </SpotlightCard>
  );
}
