"use client";

import * as React from "react";
import { Theme, ThemeContext } from "./use-theme";

const STORAGE_KEY = "epoch-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("dark");

  const getSystemTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && ["light", "dark", "system"].includes(stored)) {
        setThemeState(stored);
      }
    } catch {
      // ignore local storage errors
    }
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    root.setAttribute("data-theme", resolved);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (theme === "system") {
        const sys = getSystemTheme();
        setResolvedTheme(sys);
        root.setAttribute("data-theme", sys);
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = React.useCallback(
    (nextTheme: Theme, coordinates?: { x: number; y: number }) => {
      const root = document.documentElement;
      const targetResolved = nextTheme === "system" ? getSystemTheme() : nextTheme;

      const applyTheme = () => {
        setThemeState(nextTheme);
        setResolvedTheme(targetResolved);
        root.setAttribute("data-theme", targetResolved);
        try {
          localStorage.setItem(STORAGE_KEY, nextTheme);
        } catch {
          // ignore storage error
        }
      };

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (
        !("startViewTransition" in document) ||
        typeof document.startViewTransition !== "function" ||
        prefersReducedMotion ||
        !coordinates
      ) {
        applyTheme();
        return;
      }

      const { x, y } = coordinates;
      const transition = document.startViewTransition(applyTheme);

      transition.ready
        .then(() => {
          const maxRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
          );

          root.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${maxRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 650,
              easing: "cubic-bezier(0.65, 0, 0.35, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {
          // fallback if transition fails
        });
    },
    []
  );

  const toggleTheme = React.useCallback(
    (event?: React.MouseEvent) => {
      const next: Theme = resolvedTheme === "dark" ? "light" : "dark";
      let coordinates: { x: number; y: number } | undefined;
      if (event) {
        coordinates = { x: event.clientX, y: event.clientY };
      }
      setTheme(next, coordinates);
    },
    [resolvedTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
