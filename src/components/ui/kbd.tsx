import * as React from "react";
import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "rounded-md border border-line px-1.5 py-0.5 text-xs text-mut font-sans font-normal",
        className
      )}
    >
      {children}
    </kbd>
  );
}
