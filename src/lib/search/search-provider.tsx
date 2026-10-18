"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";

export interface SearchContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setIsOpen: (open: boolean) => void;
  setOpen: (open: boolean) => void;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function useSearchPalette(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchPalette must be used within a SearchProvider");
  }
  return context;
}

export interface SearchProviderProps {
  children: ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [isOpen, setIsOpenState] = useState(false);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const captureFocus = useCallback(() => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
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

  const value: SearchContextValue = {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
    setOpen,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}
