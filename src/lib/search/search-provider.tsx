"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";

export type PostSelectHandler = (slug: string) => boolean | void;
export type ViewModeHandler = (mode: "map" | "list") => void;
export type TopicSelectHandler = (topicId: string) => boolean | void;
export type SeriesSelectHandler = (seriesId: string) => boolean | void;
export type ActionHandler = (actionId: string) => boolean | void;

export interface SearchContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setIsOpen: (open: boolean) => void;
  setOpen: (open: boolean) => void;
  registerPostSelectHandler: (
    handler: PostSelectHandler | null
  ) => (() => void) | void;
  registerViewModeHandler: (
    handler: ViewModeHandler | null
  ) => (() => void) | void;
  registerTopicSelectHandler: (
    handler: TopicSelectHandler | null
  ) => (() => void) | void;
  registerSeriesSelectHandler: (
    handler: SeriesSelectHandler | null
  ) => (() => void) | void;
  registerActionHandler: (
    handler: ActionHandler | null
  ) => (() => void) | void;
  hasPostSelectHandler: () => boolean;
  hasTopicSelectHandler: () => boolean;
  hasSeriesSelectHandler: () => boolean;
  hasViewModeHandler: () => boolean;
  hasActionHandler: () => boolean;
  postSelectHandler: PostSelectHandler | null;
  viewModeHandler: ViewModeHandler | null;
  topicSelectHandler: TopicSelectHandler | null;
  seriesSelectHandler: SeriesSelectHandler | null;
  actionHandler: ActionHandler | null;
}

export const SearchContext = createContext<SearchContextValue | undefined>(
  undefined
);

export function useSearchPalette(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchPalette must be used within a SearchProvider");
  }
  return context;
}

export function useOptionalSearchPalette(): SearchContextValue | null {
  return useContext(SearchContext) ?? null;
}

export interface SearchProviderProps {
  children: ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [isOpen, setIsOpenState] = useState(false);

  const postSelectHandlerRef = useRef<PostSelectHandler | null>(null);
  const viewModeHandlerRef = useRef<ViewModeHandler | null>(null);
  const topicSelectHandlerRef = useRef<TopicSelectHandler | null>(null);
  const seriesSelectHandlerRef = useRef<SeriesSelectHandler | null>(null);
  const actionHandlerRef = useRef<ActionHandler | null>(null);

  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const registerPostSelectHandler = useCallback(
    (handler: PostSelectHandler | null) => {
      postSelectHandlerRef.current = handler;
      return () => {
        if (postSelectHandlerRef.current === handler) {
          postSelectHandlerRef.current = null;
        }
      };
    },
    []
  );

  const registerViewModeHandler = useCallback(
    (handler: ViewModeHandler | null) => {
      viewModeHandlerRef.current = handler;
      return () => {
        if (viewModeHandlerRef.current === handler) {
          viewModeHandlerRef.current = null;
        }
      };
    },
    []
  );

  const registerTopicSelectHandler = useCallback(
    (handler: TopicSelectHandler | null) => {
      topicSelectHandlerRef.current = handler;
      return () => {
        if (topicSelectHandlerRef.current === handler) {
          topicSelectHandlerRef.current = null;
        }
      };
    },
    []
  );

  const registerSeriesSelectHandler = useCallback(
    (handler: SeriesSelectHandler | null) => {
      seriesSelectHandlerRef.current = handler;
      return () => {
        if (seriesSelectHandlerRef.current === handler) {
          seriesSelectHandlerRef.current = null;
        }
      };
    },
    []
  );

  const registerActionHandler = useCallback(
    (handler: ActionHandler | null) => {
      actionHandlerRef.current = handler;
      return () => {
        if (actionHandlerRef.current === handler) {
          actionHandlerRef.current = null;
        }
      };
    },
    []
  );

  const hasPostSelectHandler = useCallback(
    () => postSelectHandlerRef.current !== null,
    []
  );
  const hasTopicSelectHandler = useCallback(
    () => topicSelectHandlerRef.current !== null,
    []
  );
  const hasSeriesSelectHandler = useCallback(
    () => seriesSelectHandlerRef.current !== null,
    []
  );
  const hasViewModeHandler = useCallback(
    () => viewModeHandlerRef.current !== null,
    []
  );
  const hasActionHandler = useCallback(
    () => actionHandlerRef.current !== null,
    []
  );

  const postSelectHandler = useCallback<PostSelectHandler>((slug: string) => {
    return postSelectHandlerRef.current?.(slug);
  }, []);

  const viewModeHandler = useCallback<ViewModeHandler>((mode: "map" | "list") => {
    viewModeHandlerRef.current?.(mode);
  }, []);

  const topicSelectHandler = useCallback<TopicSelectHandler>((topicId: string) => {
    return topicSelectHandlerRef.current?.(topicId);
  }, []);

  const seriesSelectHandler = useCallback<SeriesSelectHandler>((seriesId: string) => {
    return seriesSelectHandlerRef.current?.(seriesId);
  }, []);

  const actionHandler = useCallback<ActionHandler>((actionId: string) => {
    return actionHandlerRef.current?.(actionId);
  }, []);

  const captureFocus = useCallback(() => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      lastFocusedElementRef.current = document.activeElement;
    }
  }, []);

  const restoreFocus = useCallback(() => {
    if (
      lastFocusedElementRef.current &&
      typeof lastFocusedElementRef.current.focus === "function" &&
      (lastFocusedElementRef.current.isConnected ?? true)
    ) {
      lastFocusedElementRef.current.focus();
      lastFocusedElementRef.current = null;
    }
  }, []);

  const open = useCallback(() => {
    setIsOpenState((prev) => {
      if (!prev) {
        captureFocus();
        return true;
      }
      return prev;
    });
  }, [captureFocus]);

  const close = useCallback(() => {
    setIsOpenState((prev) => {
      if (prev) {
        restoreFocus();
        return false;
      }
      return prev;
    });
  }, [restoreFocus]);

  const toggle = useCallback(() => {
    setIsOpenState((prev) => {
      if (prev) {
        restoreFocus();
        return false;
      } else {
        captureFocus();
        return true;
      }
    });
  }, [captureFocus, restoreFocus]);

  const setIsOpen = useCallback(
    (nextOpen: boolean) => {
      setIsOpenState((prev) => {
        if (nextOpen && !prev) {
          captureFocus();
          return true;
        } else if (!nextOpen && prev) {
          restoreFocus();
          return false;
        }
        return nextOpen;
      });
    },
    [captureFocus, restoreFocus]
  );

  const setOpen = setIsOpen;

  // Restore focus if isOpen changes from true to false externally
  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    if (prevOpenRef.current && !isOpen) {
      restoreFocus();
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, restoreFocus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl+K or Cmd+K toggles palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
        return;
      }

      // 2. Escape closes palette
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
        return;
      }

      // 3. '/' opens palette ONLY when not typing in input, textarea, or contentEditable
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isOpen) {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl) {
          const tagName = activeEl.tagName.toUpperCase();
          const isInput = tagName === "INPUT" || tagName === "TEXTAREA";
          const isContentEditable =
            activeEl.isContentEditable ||
            activeEl.getAttribute("contenteditable") === "true";
          if (isInput || isContentEditable) {
            return;
          }
        }
        e.preventDefault();
        open();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, open, close, toggle]);

  const value = useMemo<SearchContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      setIsOpen,
      setOpen,
      registerPostSelectHandler,
      registerViewModeHandler,
      registerTopicSelectHandler,
      registerSeriesSelectHandler,
      registerActionHandler,
      hasPostSelectHandler,
      hasTopicSelectHandler,
      hasSeriesSelectHandler,
      hasViewModeHandler,
      hasActionHandler,
      postSelectHandler,
      viewModeHandler,
      topicSelectHandler,
      seriesSelectHandler,
      actionHandler,
    }),
    [
      isOpen,
      open,
      close,
      toggle,
      setIsOpen,
      setOpen,
      registerPostSelectHandler,
      registerViewModeHandler,
      registerTopicSelectHandler,
      registerSeriesSelectHandler,
      registerActionHandler,
      hasPostSelectHandler,
      hasTopicSelectHandler,
      hasSeriesSelectHandler,
      hasViewModeHandler,
      hasActionHandler,
      postSelectHandler,
      viewModeHandler,
      topicSelectHandler,
      seriesSelectHandler,
      actionHandler,
    ]
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}
