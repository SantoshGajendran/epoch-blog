import * as React from "react";
import Link from "next/link";
import { getRelatedPosts, type Post } from "@/lib/content";
import { siteConfig, topicsConfig } from "@config/index";
import { cn } from "@/lib/utils";

interface RelatedPostsProps {
  post: Post;
  className?: string;
}

export function RelatedPosts({ post, className }: RelatedPostsProps) {
  const related = getRelatedPosts(post, 3);
  if (!related || related.length === 0) return null;

  return (
    <section
      aria-label={siteConfig.ui.relatedPostsTitle}
      className={cn("my-16 border-t border-line pt-12", className)}
    >
      <h3 className="text-xl font-bold tracking-tight text-ink mb-6">
        {siteConfig.ui.relatedPostsTitle}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {related.map((item) => {
          const topic = topicsConfig.topics.find((t) => t.id === item.topic);
          const colorToken = topic?.colorToken || "--a";

          return (
            <Link
              key={item.slug}
              href={item.permalink}
              className="flex flex-col justify-between rounded-xl border border-line bg-surf p-5 transition-all hover:border-primary/50 group"
            >
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: `var(${colorToken})` }}
                  />
                  <span className="text-xs font-semibold text-mut">
                    {topic?.label || item.topic}
                  </span>
                </div>
                <h4 className="text-base font-bold text-ink leading-snug group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p className="mt-2 text-xs text-mut leading-relaxed line-clamp-2">
                  {item.summary}
                </p>
              </div>
              <div className="mt-4 text-[11px] font-mono text-mut/80">
                {item.readingTime} {siteConfig.ui.minReadSuffix}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
