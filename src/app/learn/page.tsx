import type { Metadata } from "next";
import { siteConfig } from "@config/index";
import {
  getAllPosts,
  getAllSeries,
  getAllPaths,
  getAllTips,
} from "@/lib/content";
import { LearnHubView } from "@/components/learn/learn-hub-view";

export const metadata: Metadata = {
  title: `${siteConfig.ui.learnHubTitle} — ${siteConfig.name}`,
  description: siteConfig.ui.learnHubTagline,
};

export default function LearnPage() {
  const posts = getAllPosts();
  const series = getAllSeries();
  const paths = getAllPaths();
  const tips = getAllTips();

  return (
    <LearnHubView
      posts={posts}
      series={series}
      paths={paths}
      tips={tips}
    />
  );
}
