"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { siteConfig } from "@config/index";
import { useOptionalSound } from "@/lib/audio/sound-provider";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";
import type { Tip } from "@/lib/content";

export interface TipCardProps {
  tip: Tip;
  onCopy?: () => void;
  className?: string;
}

/**
 * Bite-sized actionable engineering tip card with syntax snippet container,
 * tech badge pills, and a 1-click copy button with audio feedback and timeout reset.
 */
export function TipCard({ tip, onCopy, className }: TipCardProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sound = useOptionalSound();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tip.codeSnippet);
      }
    } catch {
      // Gracefully handle clipboard write rejection without throwing
    }

    sound?.playSound("tick");
    onCopy?.();

    setCopied(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, 2000);
  };

  const defaultCopyLabel = tip.copyLabel && tip.copyLabel.trim() !== ""
    ? tip.copyLabel
    : siteConfig.ui.copySnippetLabel;

  const currentLabel = copied ? siteConfig.ui.copiedSnippetLabel : defaultCopyLabel;

  return (
    <SpotlightCard
      className={cn(
        "p-5 flex flex-col justify-between rounded-xl border border-line/60 bg-surf/80 backdrop-blur-md shadow-sm transition-all hover:border-lime/40",
        className
      )}
    >
      <div>
        {/* Badges */}
        {tip.badges && tip.badges.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {tip.badges.map((badge) => (
              <span
                key={badge}
                className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border border-line bg-surf/90 text-mut"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-ink text-base tracking-tight mb-2">
          {tip.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-mut mb-4 leading-relaxed">
          {tip.summary}
        </p>

        {/* Code Snippet Container */}
        <div className="relative group/snippet mb-4 rounded-lg border border-line/50 bg-ink/5 dark:bg-black/50 p-3 font-mono text-xs overflow-x-auto text-ink">
          <code>{tip.codeSnippet}</code>
        </div>
      </div>

      {/* Footer / Copy Action */}
      <div className="flex items-center justify-end pt-2 border-t border-line/30">
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-1",
            copied
              ? "border-lime/60 bg-lime/15 text-lime font-semibold"
              : "border-line bg-surf text-mut hover:text-ink hover:border-line/80"
          )}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-lime" aria-hidden="true" />
          ) : (
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{currentLabel}</span>
        </button>
      </div>
    </SpotlightCard>
  );
}
