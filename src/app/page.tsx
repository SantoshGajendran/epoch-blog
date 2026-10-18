"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { siteConfig, topicsConfig } from "@config/index";
import { getAllPosts } from "@/lib/content";
import { TopicChips } from "@/components/network/topic-chips";
import { NetworkMap } from "@/components/network/network-map";
import { PostListView } from "@/components/network/post-list-view";
import { useOptionalSearchPalette } from "@/lib/search/search-provider";
import { useOptionalSound } from "@/lib/audio";

const NetworkMap3D = dynamic(
  () =>
    import("@/components/network/network-map-3d").then((mod) => mod.NetworkMap3D),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full h-[clamp(440px,68vh,640px)] border border-line rounded-2xl bg-surf overflow-hidden flex items-center justify-center animate-pulse" />
    ),
  }
);

export default function Home() {
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [dimensionMode, setDimensionMode] = useState<"2d" | "3d">("2d");
  const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);

  const posts = useMemo(() => getAllPosts(), []);
  const search = useOptionalSearchPalette();
  const sound = useOptionalSound();
  const registerPostSelectHandler = search?.registerPostSelectHandler;
  const registerTopicSelectHandler = search?.registerTopicSelectHandler;
  const registerViewModeHandler = search?.registerViewModeHandler;

  // Auto fallback to 2D when user prefers reduced motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setDimensionMode("2d");
    }
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setDimensionMode("2d");
      }
    };
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const handleSelectPost = useCallback(
    (slug: string | null) => {
      setSelectedPostSlug(slug);
      if (slug) {
        sound?.playSound("select");
      }
    },
    [sound]
  );

  useEffect(() => {
    if (
      !registerPostSelectHandler ||
      !registerTopicSelectHandler ||
      !registerViewModeHandler
    ) {
      return;
    }

    const unregisterPost = registerPostSelectHandler((slug: string) => {
      handleSelectPost(slug);
      setViewMode("map");
      return true;
    });

    const unregisterTopic = registerTopicSelectHandler((topicId: string) => {
      setActiveTopicId(topicId);
      return true;
    });

    const unregisterViewMode = registerViewModeHandler((mode: "map" | "list") => {
      setViewMode(mode);
    });

    return () => {
      unregisterPost?.();
      unregisterTopic?.();
      unregisterViewMode?.();
    };
  }, [
    registerPostSelectHandler,
    registerTopicSelectHandler,
    registerViewModeHandler,
    handleSelectPost,
  ]);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      {/* Hero section */}
      <section className="max-w-3xl py-4 sm:py-6">
        <span className="text-xs font-mono font-medium text-primary tracking-widest uppercase mb-2 inline-block">
          {siteConfig.name}
        </span>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink leading-[1.05]">
          {siteConfig.tagline}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-mut leading-relaxed">
          {siteConfig.description}
        </p>
      </section>

      {/* Interactive controls: Topic pills, 2D/3D toggle & Map/List segmented switch */}
      <TopicChips
        topics={topicsConfig.topics}
        activeTopicId={activeTopicId}
        onSelectTopic={setActiveTopicId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        dimensionMode={dimensionMode}
        onDimensionModeChange={setDimensionMode}
      />

      {/* Main stage: Neural Network Map (2D or 3D) or Accessible List View */}
      <section aria-label="Posts showcase" className="mt-4">
        {viewMode === "map" ? (
          dimensionMode === "3d" ? (
            <NetworkMap3D
              posts={posts}
              activeTopicId={activeTopicId}
              selectedPostSlug={selectedPostSlug}
              onSelectPost={handleSelectPost}
            />
          ) : (
            <NetworkMap
              posts={posts}
              activeTopicId={activeTopicId}
              selectedPostSlug={selectedPostSlug}
              onSelectPost={handleSelectPost}
            />
          )
        ) : (
          <PostListView
            posts={posts}
            activeTopicId={activeTopicId}
          />
        )}
      </section>

      {/* Prototype search shortcut hint */}
      <p className="mt-4 text-xs sm:text-sm text-mut">
        {siteConfig.ui.prototypeHint}
      </p>
    </main>
  );
}
