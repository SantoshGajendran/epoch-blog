"use client";

import React, { useEffect, useRef, useState } from "react";

export function CyberBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  // Listen for prefers-reduced-motion media query changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Pointer tracking & RAF lerp
  useEffect(() => {
    if (isReducedMotion || typeof window === "undefined") {
      if (containerRef.current) {
        containerRef.current.style.setProperty("--glow-x", "50%");
        containerRef.current.style.setProperty("--glow-y", "30%");
      }
      return;
    }

    const defaultX = (window.innerWidth || 1000) * 0.5;
    const defaultY = (window.innerHeight || 800) * 0.3;

    let targetX = defaultX;
    let targetY = defaultY;
    let currentX = defaultX;
    let currentY = defaultY;
    let isAnimating = false;
    let rafId: number | null = null;

    const safeCancelRaf = (id: number) => {
      if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(id);
      } else if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(id);
      }
    };

    const safeRequestRaf = (cb: FrameRequestCallback): number => {
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        return window.requestAnimationFrame(cb);
      } else if (typeof requestAnimationFrame === "function") {
        return requestAnimationFrame(cb);
      }
      return 0;
    };

    const updatePosition = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) {
        currentX = targetX;
        currentY = targetY;
        if (containerRef.current) {
          containerRef.current.style.setProperty("--glow-x", `${currentX}px`);
          containerRef.current.style.setProperty("--glow-y", `${currentY}px`);
        }
        isAnimating = false;
        rafId = null;
        return;
      }

      currentX += dx * 0.15;
      currentY += dy * 0.15;

      if (containerRef.current) {
        containerRef.current.style.setProperty(
          "--glow-x",
          `${Math.round(currentX * 10) / 10}px`
        );
        containerRef.current.style.setProperty(
          "--glow-y",
          `${Math.round(currentY * 10) / 10}px`
        );
      }

      rafId = safeRequestRaf(updatePosition);
    };

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      const clientX =
        typeof e.clientX === "number" && !isNaN(e.clientX) ? e.clientX : targetX;
      const clientY =
        typeof e.clientY === "number" && !isNaN(e.clientY) ? e.clientY : targetY;

      targetX = clientX;
      targetY = clientY;

      if (!isAnimating) {
        isAnimating = true;
        rafId = safeRequestRaf(updatePosition);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (rafId !== null) {
        safeCancelRaf(rafId);
        rafId = null;
      }
    };
  }, [isReducedMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
      style={
        {
          "--glow-x": "50%",
          "--glow-y": "30%",
        } as React.CSSProperties
      }
    >
      {/* SVG Dot-Matrix Grid with radial cursor mask */}
      <svg
        className="absolute inset-0 h-full w-full text-line/40 dark:text-line/25"
        style={{
          maskImage:
            "radial-gradient(circle 600px at var(--glow-x, 50%) var(--glow-y, 30%), black 0%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(circle 600px at var(--glow-x, 50%) var(--glow-y, 30%), black 0%, transparent 80%)",
        }}
      >
        <defs>
          <pattern
            id="cyber-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.5" cy="1.5" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cyber-grid)" />
      </svg>

      {/* Glacier Circuit Aurora Glows */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          left: "var(--glow-x, 50%)",
          top: "var(--glow-y, 30%)",
        }}
      >
        {/* Blob 1: Circuit lime */}
        <div
          className={`absolute -top-32 -left-32 h-96 w-96 rounded-full bg-lime/10 dark:bg-lime/15 blur-3xl ${
            isReducedMotion ? "" : "animate-pulse"
          }`}
        />
        {/* Blob 2: Cyan */}
        <div
          className={`absolute -top-16 left-16 h-80 w-80 rounded-full bg-teal-500/10 dark:bg-teal-500/15 blur-3xl ${
            isReducedMotion ? "" : "animate-pulse"
          }`}
          style={{ animationDelay: "1.5s", animationDuration: "5s" }}
        />
        {/* Blob 3: Ice blue */}
        <div
          className={`absolute top-20 -left-12 h-72 w-72 rounded-full bg-sky-500/10 dark:bg-sky-500/15 blur-3xl ${
            isReducedMotion ? "" : "animate-pulse"
          }`}
          style={{ animationDelay: "3s", animationDuration: "6s" }}
        />
      </div>
    </div>
  );
}

export default CyberBackground;
