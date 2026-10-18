import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllPosts, getPostBySlug } from "@/lib/content";
import { siteConfig, topicsConfig } from "@config/index";
import { MDXContent } from "@/components/post/mdx-content";
import { ReadingProgress } from "@/components/post/reading-progress";
import { TableOfContents } from "@/components/post/table-of-contents";
import { KeyTakeaways } from "@/components/post/key-takeaways";
import { SeriesNav } from "@/components/post/series-nav";
import { ShareButton } from "@/components/post/share-button";
import { RelatedPosts } from "@/components/post/related-posts";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: `Not Found — ${siteConfig.name}`,
    };
  }

  const topic = topicsConfig.topics.find((t) => t.id === post.topic);

  return {
    title: `${post.title} — ${siteConfig.name}`,
    description: post.summary,
    alternates: {
      canonical: `${siteConfig.url}${post.permalink}`,
    },
    openGraph: {
      title: post.title,
      description: post.summary,
      url: `${siteConfig.url}${post.permalink}`,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated || post.date,
      tags: post.tags,
      section: topic?.label,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const topic = topicsConfig.topics.find((t) => t.id === post.topic);
  const colorToken = topic?.colorToken || "--a";
  const postUrl = `${siteConfig.url}${post.permalink}`;

  return (
    <>
      <ReadingProgress />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation & Topic Bar */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-mut hover:text-ink transition-colors focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{siteConfig.ui.backToMapLabel}</span>
          </Link>

          <ShareButton title={post.title} text={post.summary} url={postUrl} />
        </div>

        {/* Article Header */}
        <header className="max-w-3xl mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: `color-mix(in srgb, var(${colorToken}) 12%, transparent)`,
                color: `var(${colorToken})`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `var(${colorToken})` }}
              />
              {topic?.label || post.topic}
            </span>
            <span className="text-xs text-mut font-mono">
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-mut">•</span>
            <span className="text-xs text-mut font-mono">
              {post.readingTime} {siteConfig.ui.minReadSuffix}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.08] mb-4">
            {post.title}
          </h1>

          <p className="text-lg text-mut leading-relaxed">
            {post.summary}
          </p>
        </header>

        {/* Key Takeaways */}
        <div className="max-w-3xl">
          <KeyTakeaways summary={post.summary} />
        </div>

        {/* Series Banner (if part of series) */}
        {post.series && (
          <div className="max-w-3xl">
            <SeriesNav seriesId={post.series.id} currentSlug={post.slug} />
          </div>
        )}

        {/* Two-Column Grid: Main Content + Sticky TOC */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-8">
          <aside className="order-first lg:order-last lg:col-span-4">
            <TableOfContents toc={post.toc} />
          </aside>

          <article className="order-last lg:order-first lg:col-span-8 min-w-0 prose prose-slate dark:prose-invert max-w-none text-ink font-sans text-base leading-relaxed">
            <MDXContent code={post.body} />
          </article>
        </div>

        {/* Bottom Series Nav */}
        {post.series && (
          <div className="max-w-3xl mt-12">
            <SeriesNav seriesId={post.series.id} currentSlug={post.slug} />
          </div>
        )}

        {/* Related Posts */}
        <RelatedPosts post={post} />
      </main>
    </>
  );
}
