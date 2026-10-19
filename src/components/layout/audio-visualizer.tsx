"use client";

import * as React from "react";
import { siteConfig } from "@config/index";
import { useOptionalSound } from "@/lib/audio";
import clsx from "clsx";

const IDLE_HEIGHTS = [3, 6, 8, 5, 4];
const PEAK_HEIGHTS = [13, 16, 15, 14, 12];
const MUTED_HEIGHTS = [2, 2, 2, 2, 2];
const REDUCED_MOTION_HEIGHTS = [4, 4, 4, 4, 4];

export function AudioVisualizer() {
  const sound = useOptionalSound();
  const isSoundEnabled = sound?.isSoundEnabled ?? false;

  const [isPeaking, setIsPeaking] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  React.useEffect(() => {
    if (!isSoundEnabled || prefersReducedMotion) {
      setIsPeaking(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleSoundPlay = () => {
      setIsPeaking(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setIsPeaking(false);
      }, 300);
    };

    window.addEventListener("epoch:sound-play", handleSoundPlay);
    return () => {
      window.removeEventListener("epoch:sound-play", handleSoundPlay);
      if (timer) clearTimeout(timer);
    };
  }, [isSoundEnabled, prefersReducedMotion]);

  let barHeights: number[];
  let barColorClass: string;

  if (!isSoundEnabled) {
    barHeights = MUTED_HEIGHTS;
    barColorClass = "bg-mut/40";
  } else if (prefersReducedMotion) {
    barHeights = REDUCED_MOTION_HEIGHTS;
    barColorClass = "bg-primary/50";
  } else if (isPeaking) {
    barHeights = PEAK_HEIGHTS;
    barColorClass = "bg-primary shadow-[0_0_6px_var(--color-primary,rgba(163,230,53,0.7))]";
  } else {
    barHeights = IDLE_HEIGHTS;
    barColorClass = "bg-primary/70";
  }

  return (
    <div
      role="img"
      aria-label={siteConfig.ui.audioVisualizerAriaLabel}
      className="flex h-4 w-4 select-none items-end justify-between gap-[1.5px] pointer-events-none"
    >
      {barHeights.map((height, index) => (
        <span
          key={index}
          className={clsx(
            "w-[2px] rounded-full transition-all duration-300 ease-out",
            barColorClass
          )}
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}
