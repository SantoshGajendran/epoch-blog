"use client";

import React, { useState, useEffect, useRef, useMemo, useContext } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useOptionalSearchPalette } from "@/lib/search/search-provider";
import { ThemeContext } from "@/lib/theme/use-theme";
import { buildSearchIndex } from "@/lib/search";
import type {
  SearchItem,
  SearchActionItem,
  TopicConfigItem,
} from "@/lib/search/types";
import type { Post, Series } from "@/lib/content";
import { siteConfig } from "@config/site";
import { topicsConfig } from "@config/topics";

export interface CommandPaletteProps {
  posts?: Post[];
  series?: Series[];
  topics?: TopicConfigItem[];
  actions?: SearchActionItem[];
  onSelectPost?: (slug: string) => void;
  onSelectTopic?: (topicId: string) => void;
  onSelectSeries?: (seriesId: string) => void;
  onSelectAction?: (actionId: string) => void;
}

const defaultActions: SearchActionItem[] = [
  {
    id: "toggle-theme",
    title: siteConfig.ui.actionSwitchThemeLabel,
    category: siteConfig.ui.searchGroupActionsLabel,
    action: () => {},
  },
  {
    id: "switch-map",
    title: siteConfig.ui.actionShowMapLabel,
    category: siteConfig.ui.searchGroupActionsLabel,
    action: () => {},
  },
  {
    id: "switch-list",
    title: siteConfig.ui.actionShowListLabel,
    category: siteConfig.ui.searchGroupActionsLabel,
    action: () => {},
  },
];

function useSafeRouter() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRouter();
  } catch {
    return null;
  }
}

export function CommandPalette({
  posts = [],
  series = [],
  topics = topicsConfig.topics,
  actions = defaultActions,
  onSelectPost,
  onSelectTopic,
  onSelectSeries,
  onSelectAction,
}: CommandPaletteProps) {
  const search = useOptionalSearchPalette();
  const themeContext = useContext(ThemeContext);
  const router = useSafeRouter();

  const isOpen = search?.isOpen ?? false;
  const close = search?.close ?? (() => {});

  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset query whenever palette opens
  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setQuery("");
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      const timer = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen]);

  // Build search engine from current posts, series, topics, actions
  const engine = useMemo(() => {
    return buildSearchIndex(posts, series, topics, actions);
  }, [posts, series, topics, actions]);

  // Compute results: defaults when query is empty, else indexed fuzzy search
  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return engine.getDefaults();
    }
    return engine.search(trimmed);
  }, [engine, query]);

  const actionResults = useMemo(
    () => results.filter((r) => r.item.type === "action"),
    [results]
  );
  const topicResults = useMemo(
    () => results.filter((r) => r.item.type === "topic"),
    [results]
  );
  const postResults = useMemo(
    () => results.filter((r) => r.item.type === "post"),
    [results]
  );
  const seriesResults = useMemo(
    () => results.filter((r) => r.item.type === "series"),
    [results]
  );

  const handleSelect = (item: SearchItem) => {
    close();

    switch (item.type) {
      case "post":
        if (item.slug) {
          onSelectPost?.(item.slug);
          const hasInterceptor = search?.hasPostSelectHandler?.() ?? false;
          if (hasInterceptor) {
            const result = search?.postSelectHandler?.(item.slug);
            if (result === false && !onSelectPost && router) {
              router.push(item.url || `/posts/${item.slug}`);
            }
          } else if (!onSelectPost && router) {
            router.push(item.url || `/posts/${item.slug}`);
          }
        }
        break;
      case "topic":
        if (item.topicId) {
          onSelectTopic?.(item.topicId);
          const hasInterceptor = search?.hasTopicSelectHandler?.() ?? false;
          if (hasInterceptor) {
            const result = search?.topicSelectHandler?.(item.topicId);
            if (result === false && !onSelectTopic && router) {
              router.push(`/?topic=${item.topicId}`);
            }
          } else if (!onSelectTopic && router) {
            router.push(`/?topic=${item.topicId}`);
          }
        }
        break;
      case "series":
        if (item.seriesId || item.slug) {
          const sId = item.seriesId || item.slug!;
          onSelectSeries?.(sId);
          const hasInterceptor = search?.hasSeriesSelectHandler?.() ?? false;
          if (hasInterceptor) {
            const result = search?.seriesSelectHandler?.(sId);
            if (result === false && !onSelectSeries && router) {
              router.push(`/series/${sId}`);
            }
          } else if (!onSelectSeries && router) {
            router.push(`/series/${sId}`);
          }
        }
        break;
      case "action":
        item.action?.();
        if (item.id === "toggle-theme" || item.actionId === "toggle-theme") {
          themeContext?.toggleTheme();
        } else if (item.id === "switch-map" || item.actionId === "switch-map") {
          search?.viewModeHandler?.("map");
        } else if (
          item.id === "switch-list" ||
          item.actionId === "switch-list"
        ) {
          search?.viewModeHandler?.("list");
        }
        search?.actionHandler?.(item.actionId || item.id);
        if (item.actionId || item.id) {
          onSelectAction?.(item.actionId || item.id);
        }
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }

    if (e.key === "Tab") {
      const dialogEl = dialogRef.current;
      if (!dialogEl) return;
      const focusable = dialogEl.querySelectorAll<HTMLElement>(
        'input, button, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (
          document.activeElement === first ||
          document.activeElement === dialogEl
        ) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={siteConfig.ui.searchAriaLabel}
      data-testid="command-palette-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          close();
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-xl bg-surf border border-line rounded-2xl shadow-2xl overflow-hidden text-ink flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          shouldFilter={false}
          label={siteConfig.ui.searchAriaLabel}
          className="w-full flex flex-col bg-transparent"
        >
          <div className="flex items-center px-4 border-b border-line gap-3">
            <Search className="w-5 h-5 text-mut shrink-0" aria-hidden="true" />
            <Command.Input
              ref={inputRef}
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={siteConfig.ui.searchPlaceholder}
              className="w-full py-4 bg-transparent outline-none text-ink placeholder:text-mut text-base font-sans"
            />
          </div>

          <Command.List className="max-h-[50vh] overflow-y-auto p-2 scroll-py-2 focus:outline-none">
            {results.length === 0 ? (
              <div
                cmdk-empty=""
                role="presentation"
                className="py-8 text-center text-sm text-mut"
              >
                {siteConfig.ui.noSearchResultsLabel}
              </div>
            ) : (
              <>
                {actionResults.length > 0 && (
                  <Command.Group
                    heading={siteConfig.ui.searchGroupActionsLabel}
                    className="p-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-mut"
                  >
                    {actionResults.map(({ item }) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer select-none outline-none transition-colors data-[selected=true]:bg-lime data-[selected=true]:text-limeink font-medium"
                      >
                        <span className="truncate mr-2">{item.title}</span>
                        <span className="text-xs shrink-0 opacity-65 font-normal">
                          {item.category}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {topicResults.length > 0 && (
                  <Command.Group
                    heading={siteConfig.ui.searchGroupTopicsLabel}
                    className="p-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-mut"
                  >
                    {topicResults.map(({ item }) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer select-none outline-none transition-colors data-[selected=true]:bg-lime data-[selected=true]:text-limeink font-medium"
                      >
                        <div className="flex flex-col gap-0.5 truncate mr-2">
                          <span className="truncate">{item.title}</span>
                          {item.summary && (
                            <span className="text-xs opacity-70 line-clamp-1 font-normal">
                              {item.summary}
                            </span>
                          )}
                        </div>
                        <span className="text-xs shrink-0 opacity-65 font-normal">
                          {item.category}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {seriesResults.length > 0 && (
                  <Command.Group
                    heading={siteConfig.ui.searchGroupSeriesLabel}
                    className="p-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-mut"
                  >
                    {seriesResults.map(({ item }) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer select-none outline-none transition-colors data-[selected=true]:bg-lime data-[selected=true]:text-limeink font-medium"
                      >
                        <div className="flex flex-col gap-0.5 truncate mr-2">
                          <span className="truncate">{item.title}</span>
                          {item.summary && (
                            <span className="text-xs opacity-70 line-clamp-1 font-normal">
                              {item.summary}
                            </span>
                          )}
                        </div>
                        <span className="text-xs shrink-0 opacity-65 font-normal">
                          {item.category}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {postResults.length > 0 && (
                  <Command.Group
                    heading={siteConfig.ui.searchGroupPostsLabel}
                    className="p-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-mut"
                  >
                    {postResults.map(({ item }) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer select-none outline-none transition-colors data-[selected=true]:bg-lime data-[selected=true]:text-limeink font-medium"
                      >
                        <div className="flex flex-col gap-0.5 truncate mr-2">
                          <span className="truncate">{item.title}</span>
                          {item.summary && (
                            <span className="text-xs opacity-70 line-clamp-1 font-normal">
                              {item.summary}
                            </span>
                          )}
                        </div>
                        <span className="text-xs shrink-0 opacity-65 font-normal">
                          {item.category}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
