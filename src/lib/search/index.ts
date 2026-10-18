import MiniSearch from "minisearch";
import { siteConfig } from "@config/site";
import type { Post, Series } from "@/lib/content";
import type {
  SearchItem,
  SearchResult,
  SearchActionItem,
  SearchEngine,
  SearchIndex,
  TopicConfigItem,
} from "./types";

export * from "./types";

export function buildSearchIndex(
  posts: Post[],
  series: Series[],
  topics: TopicConfigItem[],
  actions: SearchActionItem[] = []
): SearchEngine {
  const items: SearchItem[] = [];
  const itemsMap = new Map<string, SearchItem>();
  const usedIds = new Set<string>();

  function registerUniqueId(rawId: string, prefix: string): string {
    if (!usedIds.has(rawId)) {
      usedIds.add(rawId);
      return rawId;
    }
    const scoped = `${prefix}-${rawId}`;
    usedIds.add(scoped);
    return scoped;
  }

  // 1. Index Posts
  for (const post of posts) {
    const postTags = post.tags ? [...post.tags] : [];
    if (post.topic && !postTags.includes(post.topic)) {
      postTags.push(post.topic);
    }

    const postItem: SearchItem = {
      id: registerUniqueId(post.slug, "post"),
      title: post.title,
      summary: post.summary,
      type: "post",
      slug: post.slug,
      topicId: post.topic,
      seriesId: post.series?.id,
      category: siteConfig.ui.searchGroupPostsLabel,
      tags: postTags,
      url: post.permalink || `/posts/${post.slug}`,
    };
    items.push(postItem);
    itemsMap.set(postItem.id, postItem);
  }

  // 2. Index Topics
  for (const topic of topics) {
    const topicItem: SearchItem = {
      id: registerUniqueId(topic.id, "topic"),
      title: topic.label,
      summary: topic.description,
      type: "topic",
      topicId: topic.id,
      category: siteConfig.ui.searchGroupTopicsLabel,
      tags: [topic.id, topic.label],
      url: `/?topic=${topic.id}`,
    };
    items.push(topicItem);
    itemsMap.set(topicItem.id, topicItem);
  }

  // 3. Index Series
  for (const s of series) {
    const seriesItem: SearchItem = {
      id: registerUniqueId(s.id, "series"),
      title: s.title,
      summary: s.summary,
      type: "series",
      slug: s.slug,
      seriesId: s.id,
      category: siteConfig.ui.searchGroupSeriesLabel,
      tags: [s.id],
      url: s.permalink || `/series/${s.slug}`,
    };
    items.push(seriesItem);
    itemsMap.set(seriesItem.id, seriesItem);
  }

  // 4. Index Actions
  const actionItems: SearchItem[] = [];
  for (const action of actions) {
    const actionItem: SearchItem = {
      id: registerUniqueId(action.id, "action"),
      title: action.title,
      type: "action",
      actionId: action.id,
      category: action.category || siteConfig.ui.searchGroupActionsLabel,
      tags: [],
      action: action.action,
    };
    items.push(actionItem);
    itemsMap.set(actionItem.id, actionItem);
    actionItems.push(actionItem);
  }

  // 5. Initialize MiniSearch
  const miniSearch: SearchIndex = new MiniSearch<SearchItem>({
    fields: ["title", "summary", "tags", "category"],
    storeFields: [
      "id",
      "title",
      "summary",
      "type",
      "slug",
      "topicId",
      "seriesId",
      "actionId",
      "category",
      "tags",
      "url",
    ],
    extractField: (document, fieldName) => {
      const val = (document as unknown as Record<string, unknown>)[fieldName];
      if (Array.isArray(val)) {
        return val.join(" ");
      }
      return typeof val === "string" ? val : "";
    },
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: {
        title: 2,
        tags: 1.5,
        summary: 1,
      },
    },
  });

  miniSearch.addAll(items);

  // 6. Precompute Defaults for Empty Queries
  const defaultActionResults: SearchResult[] = actionItems.map((item) => ({
    item,
    score: 1,
    terms: [],
  }));

  const sortedPosts = [...posts].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    return timeB - timeA;
  });

  const defaultPostResults: SearchResult[] = sortedPosts.map((post) => {
    const item = itemsMap.get(post.slug) || items.find((it) => it.slug === post.slug && it.type === "post")!;
    return {
      item,
      score: 1,
      terms: [],
    };
  });

  const defaultResults: SearchResult[] = [...defaultActionResults, ...defaultPostResults];

  return {
    index: miniSearch,
    getDefaults: () => defaultResults,
    search: (query: string): SearchResult[] => {
      if (!query || query.trim() === "") {
        return defaultResults;
      }

      const results = miniSearch.search(query.trim(), {
        prefix: true,
        fuzzy: 0.2,
        boost: {
          title: 2,
          tags: 1.5,
          summary: 1,
        },
      });

      return results.map((res) => {
        const item = itemsMap.get(res.id) || (res as unknown as SearchItem);
        return {
          item,
          score: res.score,
          terms: res.terms,
        };
      });
    },
  };
}
