import type MiniSearch from "minisearch";
import type { Topic } from "@config/schemas/topics";
import type { Post, Series } from "@/lib/content";

export type SearchItemType = "post" | "topic" | "series" | "action";

export interface SearchItem {
  id: string;
  title: string;
  summary?: string;
  type: SearchItemType;
  slug?: string;
  topicId?: string;
  seriesId?: string;
  actionId?: string;
  category: string;
  tags?: string[];
  url?: string;
  action?: () => void;
}

export interface SearchResult {
  item: SearchItem;
  score: number;
  terms: string[];
}

export interface SearchActionItem {
  id: string;
  title: string;
  category: string;
  action: () => void;
}

export type TopicConfigItem = Topic;

export type SearchIndex = MiniSearch<SearchItem>;

export interface SearchEngine {
  index: SearchIndex;
  search: (query: string) => SearchResult[];
  getDefaults: () => SearchResult[];
}

export type { Post, Series, Topic };
