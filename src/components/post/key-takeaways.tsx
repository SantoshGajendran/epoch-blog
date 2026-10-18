import * as React from "react";
import { Zap } from "lucide-react";
import { siteConfig } from "@config/index";
import { cn } from "@/lib/utils";

export interface KeyTakeawaysProps {
  summary: string;
  points?: string[];
  className?: string;
}

export function KeyTakeaways({ summary, points, className }: KeyTakeawaysProps) {
  return (
    <div
      className={cn(
        "my-8 rounded-xl border border-line bg-surf/80 p-6 backdrop-blur-sm relative overflow-hidden",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold tracking-wide text-ink uppercase font-mono">
          {siteConfig.ui.keyTakeawaysTitle}
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-ink/90 font-sans">{summary}</p>
      {points && points.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line/60 pt-3 text-sm text-mut">
          {points.map((point, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary mt-1" aria-hidden="true">•</span>
              <span className="flex-1 text-ink/80">{point}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
