"use client";

import React, { useState, useMemo } from "react";
import { siteConfig, topicsConfig } from "@config/index";
import { getAllPosts } from "@/lib/content";
import { TopicChips } from "@/components/network/topic-chips";
import { NetworkMap } from "@/components/network/network-map";
import { PostListView } from "@/components/network/post-list-view";

export default function Home() {
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const posts = useMemo(() => getAllPosts(), []);

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

      {/* Interactive controls: Topic pills & Map/List segmented switch */}
      <TopicChips
        topics={topicsConfig.topics}
        activeTopicId={activeTopicId}
        onSelectTopic={setActiveTopicId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main stage: Neural Network Map or Accessible List View */}
      <section aria-label="Posts showcase" className="mt-4">
        {viewMode === "map" ? (
          <NetworkMap
            posts={posts}
            activeTopicId={activeTopicId}
          />
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
