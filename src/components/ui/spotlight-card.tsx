"use client";

import React, { useEffect, useRef, useState, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { useOptionalSound } from "@/lib/audio/sound-provider";

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: string; // defaults to Glacier Circuit lime: "rgba(163, 230, 53, 0.12)"
  maxTilt?: number; // default: 6 degrees
  className?: string;
  enableTilt?: boolean; // default: true
  enableGlow?: boolean; // default: true
}

/**
 * 3D perspective interactive card container with tactile tilt,
 * floating depth, and inner radial cursor spotlight glow.
 */
export const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(
  function SpotlightCard(
    {
      children,
      glowColor = "rgba(163, 230, 53, 0.12)",
      maxTilt = 6,
      className,
      enableTilt = true,
      enableGlow = true,
      style,
      onPointerEnter,
      onPointerMove,
      onPointerLeave,
      ...rest
    },
    ref
  ) {
    const innerRef = useRef<HTMLDivElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);
    const sound = useOptionalSound();

    useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

    const [isReducedMotion, setIsReducedMotion] = useState<boolean>(() => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });

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

    useEffect(() => {
      if (isReducedMotion && innerRef.current) {
        innerRef.current.style.transform = "none";
      }
    }, [isReducedMotion]);

    const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
      sound?.playSound("hover");

      if (enableGlow && glowRef.current) {
        glowRef.current.style.opacity = "1";
      }

      if (enableTilt && !isReducedMotion && innerRef.current) {
        innerRef.current.style.transition = "transform 0.1s ease-out";
      }

      onPointerEnter?.(e);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!innerRef.current) {
        onPointerMove?.(e);
        return;
      }

      const rect = innerRef.current.getBoundingClientRect();
      const width = rect.width || innerRef.current.offsetWidth || 300;
      const height = rect.height || innerRef.current.offsetHeight || 200;
      const left = rect.left ?? 0;
      const top = rect.top ?? 0;

      const clientX =
        typeof e.clientX === "number" && !isNaN(e.clientX) ? e.clientX : 0;
      const clientY =
        typeof e.clientY === "number" && !isNaN(e.clientY) ? e.clientY : 0;

      const x = clientX - left;
      const y = clientY - top;

      // Normalized center offsets in [-1, 1]
      const nx = Math.max(-1, Math.min(1, (x / width - 0.5) * 2));
      const ny = Math.max(-1, Math.min(1, (y / height - 0.5) * 2));

      // Update 3D Tilt Transform if tilt enabled and not reduced motion
      if (enableTilt && !isReducedMotion) {
        const rotateX = Number((-ny * maxTilt).toFixed(2));
        const rotateY = Number((nx * maxTilt).toFixed(2));
        innerRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
      } else {
        innerRef.current.style.transform = "none";
      }

      // Update Cursor Spotlight Glow if glow enabled
      if (enableGlow && glowRef.current) {
        glowRef.current.style.opacity = "1";
        glowRef.current.style.background = `radial-gradient(280px circle at ${Math.round(x)}px ${Math.round(y)}px, ${glowColor}, transparent 80%)`;
      }

      onPointerMove?.(e);
    };

    const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
      if (innerRef.current) {
        if (enableTilt && !isReducedMotion) {
          innerRef.current.style.transition =
            "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)";
          innerRef.current.style.transform =
            "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)";
        } else {
          innerRef.current.style.transform = "none";
        }
      }

      if (enableGlow && glowRef.current) {
        glowRef.current.style.opacity = "0";
      }

      onPointerLeave?.(e);
    };

    return (
      <div
        ref={innerRef}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={cn("relative will-change-transform", className)}
        style={{
          transformStyle: "preserve-3d",
          ...style,
        }}
        {...rest}
      >
        {enableGlow && (
          <div
            ref={glowRef}
            data-testid="spotlight-glow"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden transition-opacity duration-300"
            style={{
              opacity: 0,
              background: `radial-gradient(280px circle at 50% 50%, ${glowColor}, transparent 80%)`,
            }}
          />
        )}
        {children}
      </div>
    );
  }
);

SpotlightCard.displayName = "SpotlightCard";
