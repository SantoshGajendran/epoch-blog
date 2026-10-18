"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ReadingProgressProps {
  className?: string;
  targetRef?: React.RefObject<HTMLElement | null>;
}

export function ReadingProgress({ className, targetRef }: ReadingProgressProps) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      if (targetRef?.current) {
        const element = targetRef.current;
        const elementTop = typeof element.offsetTop === "number" && !isNaN(element.offsetTop)
          ? element.offsetTop
          : element.getBoundingClientRect().top + window.scrollY;
        const elementHeight = element.offsetHeight || 0;
        const windowHeight = window.innerHeight;
        const totalScrollable = elementHeight - windowHeight;

        if (totalScrollable <= 0) {
          setProgress(window.scrollY >= elementTop ? 100 : 0);
          return;
        }

        const scrollDistance = window.scrollY - elementTop;
        const percentage = Math.min(100, Math.max(0, Math.round((scrollDistance / totalScrollable) * 100)));
        setProgress(percentage);
        return;
      }

      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        setProgress(0);
        return;
      }
      const currentScroll = window.scrollY;
      const percentage = Math.min(100, Math.max(0, Math.round((currentScroll / scrollHeight) * 100)));
      setProgress(percentage);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [targetRef]);

  return (
    <div
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent", className)}
    >
      <div
        className="h-full bg-lime transition-[width] duration-150 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
