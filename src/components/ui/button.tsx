import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-surf border border-line text-ink hover:border-primary shadow-sm",
          variant === "outline" && "border border-line bg-transparent hover:bg-surf text-ink",
          variant === "ghost" && "hover:bg-surf text-ink",
          size === "default" && "h-9 px-3.5 py-1.5 gap-2",
          size === "sm" && "h-8 px-2.5 text-xs gap-1.5",
          size === "icon" && "h-9 w-9",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
