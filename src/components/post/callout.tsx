import React from "react";
import { Info, Lightbulb, AlertTriangle, AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalloutType = "note" | "tip" | "important" | "warning" | "caution";

export interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const icons: Record<CalloutType, React.ElementType> = {
  note: Info,
  tip: Lightbulb,
  important: AlertCircle,
  warning: AlertTriangle,
  caution: ShieldAlert,
};

const styles: Record<CalloutType, { border: string; bg: string; text: string }> = {
  note: {
    border: "border-primary/40",
    bg: "bg-primary/5",
    text: "text-primary",
  },
  tip: {
    border: "border-lime/60",
    bg: "bg-lime/10",
    text: "text-limeink dark:text-lime",
  },
  important: {
    border: "border-primary/60",
    bg: "bg-primary/10",
    text: "text-primary",
  },
  warning: {
    border: "border-amber-500/50",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  caution: {
    border: "border-red-500/50",
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
  },
};

export function Callout({ type = "note", title, children, className }: CalloutProps) {
  const Icon = icons[type];
  const style = styles[type];

  return (
    <aside
      role="region"
      data-type={type}
      aria-label={title || `${type} callout`}
      className={cn(
        "my-6 flex gap-3.5 rounded-lg border p-4 text-sm leading-relaxed",
        style.border,
        style.bg,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", style.text)} aria-hidden="true" />
      <div className="flex-1">
        {title && <div className={cn("font-semibold mb-1", style.text)}>{title}</div>}
        <div className="text-ink [&>p]:leading-relaxed">{children}</div>
      </div>
    </aside>
  );
}
