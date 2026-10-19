"use client";

import React, { useState, useEffect } from "react";
import { siteConfig } from "@config/index";
import { useOptionalSound } from "@/lib/audio";
import { cn } from "@/lib/utils";

export interface TelemetryBarProps {
  totalNeurons: number;
  postNeurons: number;
  signalCount?: number;
  dimensionMode: "2d" | "3d";
  className?: string;
}

export function TelemetryBar({
  totalNeurons,
  postNeurons,
  signalCount = 0,
  dimensionMode,
  className,
}: TelemetryBarProps) {
  const sound = useOptionalSound();
  const isSoundEnabled = sound?.isSoundEnabled ?? false;

  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [latency, setLatency] = useState(14);
  const [signalHz, setSignalHz] = useState(4.0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mql.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    } else if (typeof mql.addListener === "function") {
      mql.addListener(handler);
      return () => mql.removeListener(handler);
    }
  }, []);

  useEffect(() => {
    if (isReducedMotion) {
      setLatency(14);
      setSignalHz(4.0);
      return;
    }

    const updateMetrics = () => {
      const nextLatency = Math.floor(12 + Math.random() * 5); // 12-16 ms
      const baseFreq = signalCount > 0 ? 3.8 + Math.min(signalCount * 0.1, 0.4) : 4.0;
      const jitter = (Math.random() - 0.5) * 0.4;
      const nextHz = Math.round((baseFreq + jitter) * 10) / 10;
      setLatency(nextLatency);
      setSignalHz(nextHz);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2500);
    return () => clearInterval(interval);
  }, [isReducedMotion, signalCount]);

  const dimensionLabel =
    dimensionMode === "3d"
      ? siteConfig.ui.viewMode3dLabel
      : siteConfig.ui.viewMode2dLabel;

  const synthLabel = isSoundEnabled
    ? siteConfig.ui.telemetrySynthActiveLabel
    : siteConfig.ui.telemetrySynthMutedLabel;

  return (
    <div
      role="status"
      aria-live="off"
      className={cn(
        "flex flex-wrap items-center justify-between gap-y-2 gap-x-4 px-4 py-2 rounded-xl border border-line/60 bg-surf/70 backdrop-blur-md font-mono text-xs uppercase tracking-wider text-mut",
        className
      )}
    >
      {/* Cluster Status Beacon */}
      <div className="flex items-center gap-2">
        <span
          data-testid="telemetry-beacon"
          className={cn(
            "w-2 h-2 rounded-full bg-lime shadow-[0_0_8px_rgba(163,230,53,0.8)]",
            !isReducedMotion && "animate-pulse"
          )}
        />
        <span className="font-semibold text-ink">
          {siteConfig.ui.telemetryClusterOnlineLabel}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {/* Topology */}
        <span className="inline-flex items-center gap-1">
          <span className="text-mut">{siteConfig.ui.telemetryNodesLabel}:</span>
          <strong className="font-semibold text-ink">{totalNeurons}</strong>
          <span className="text-mut">
            ({postNeurons} {siteConfig.ui.telemetryPostsLabel})
          </span>
        </span>

        {/* Signal Frequency */}
        <span className="hidden sm:inline-flex items-center gap-1">
          <span className="text-mut">{siteConfig.ui.telemetrySignalsLabel}:</span>
          <strong className="font-semibold text-ink">~{signalHz.toFixed(1)} Hz</strong>
        </span>

        {/* Inference Latency */}
        <span className="hidden sm:inline-flex items-center gap-1">
          <span className="text-mut">{siteConfig.ui.telemetryInferenceLabel}:</span>
          <strong className="font-semibold text-ink">{latency} ms</strong>
        </span>

        {/* Dimension Mode Badge */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-line/60 bg-surf font-medium text-ink">
          {dimensionLabel}
        </span>

        {/* Synth Audio Status */}
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium transition-colors",
            isSoundEnabled
              ? "border-lime/40 bg-lime/10 text-lime"
              : "border-line/40 bg-surf/40 text-mut"
          )}
        >
          {synthLabel}
        </span>
      </div>
    </div>
  );
}
