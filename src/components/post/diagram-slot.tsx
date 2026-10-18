import * as React from "react";
import { cn } from "@/lib/utils";

export interface DiagramSlotProps {
  name: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function DiagramSlot({
  name,
  title,
  description,
  children,
  className,
}: DiagramSlotProps) {
  return (
    <div
      data-diagram-slot={name}
      className={cn(
        "my-8 rounded-xl border border-line bg-surf/60 p-6 backdrop-blur-sm",
        className
      )}
    >
      <div className="mb-4">
        <div className="text-xs font-mono uppercase tracking-wider text-primary">Interactive Diagram</div>
        <h4 className="text-base font-semibold text-ink">{title}</h4>
        {description && <p className="mt-1 text-xs text-mut">{description}</p>}
      </div>
      <div className="relative min-h-[200px] flex items-center justify-center rounded-lg border border-line/60 bg-bg/40 p-4">
        {children || (
          <div className="text-center font-mono text-xs text-mut">
            [Interactive Component Slot: {name}]
          </div>
        )}
      </div>
    </div>
  );
}
