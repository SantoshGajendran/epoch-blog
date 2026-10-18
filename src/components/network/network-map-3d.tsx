"use client";

import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import { topicsConfig, graphConfig } from "@config/index";
import { buildNetworkGraph, ThreeNetworkRenderer } from "@/lib/network";
import type { Post } from "@/lib/content";
import { useOptionalSound } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { PostPreviewCard } from "./post-preview-card";

export interface NetworkMap3DProps {
  posts: Post[];
  selectedPostSlug?: string | null;
  onSelectPost?: (slug: string | null) => void;
  activeTopicId?: string | null;
  className?: string;
  ariaLabel?: string;
}

/**
 * Dynamic 3D WebGL Neural Network Map component.
 * Integrates ThreeNetworkRenderer with full React lifecycle, pointer raycasting,
 * keyboard accessibility, responsive ResizeObserver, IntersectionObserver auto-pause,
 * theme reactivity, and Web Audio feedback.
 */
export function NetworkMap3D({
  posts,
  selectedPostSlug,
  onSelectPost,
  activeTopicId,
  className,
  ariaLabel = "Interactive neural network map",
}: NetworkMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sound = useOptionalSound();

  // Uncontrolled fallback if selectedPostSlug is not passed as controlled prop
  const [internalSelectedSlug, setInternalSelectedSlug] = useState<string | null>(null);
  const isControlled = selectedPostSlug !== undefined;
  const currentSelectedSlug = isControlled ? selectedPostSlug : internalSelectedSlug;

  const handleSelectPost = useCallback(
    (slug: string | null) => {
      if (!isControlled) {
        setInternalSelectedSlug(slug);
      }
      onSelectPost?.(slug);
      if (slug) {
        sound?.playSound("select");
      }
    },
    [isControlled, onSelectPost, sound]
  );

  // Selected post object for preview card
  const selectedPost = useMemo(() => {
    if (!currentSelectedSlug) return null;
    return posts.find((p) => p.slug === currentSelectedSlug) ?? null;
  }, [posts, currentSelectedSlug]);

  // Memoized network graph
  const graph = useMemo(
    () => buildNetworkGraph(topicsConfig.topics, graphConfig, posts),
    [posts]
  );

  // Interactive post neurons for keyboard navigation
  const interactivePostNeurons = useMemo(() => {
    return graph.postNeurons.filter(
      (n) => n.post && (!activeTopicId || n.topicId === activeTopicId)
    );
  }, [graph, activeTopicId]);

  // Simulation engine & lifecycle refs
  const rendererRef = useRef<ThreeNetworkRenderer | null>(null);
  const isReducedMotionRef = useRef<boolean>(false);
  const isOffScreenRef = useRef<boolean>(false);
  const isDocHiddenRef = useRef<boolean>(false);
  const isLoopRunningRef = useRef<boolean>(false);
  const rafIdRef = useRef<number>(0);
  const focusedNeuronIndexRef = useRef<number>(-1);
  const settleCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastSelectedSlugRef = useRef<string | null>(null);

  // Core 3D render loop function
  const loop = useCallback(
    (time: number) => {
      if (isOffScreenRef.current || isDocHiddenRef.current) {
        isLoopRunningRef.current = false;
        return;
      }

      const dt =
        lastTimeRef.current > 0
          ? Math.min(time - lastTimeRef.current, 64)
          : 16;
      lastTimeRef.current = time;

      rendererRef.current?.render(dt, time, isReducedMotionRef.current);

      if (!isReducedMotionRef.current || settleCountRef.current++ < 60) {
        rafIdRef.current = requestAnimationFrame(loop);
      } else {
        isLoopRunningRef.current = false;
      }
    },
    []
  );

  // Kick or resume the animation loop
  const kickLoop = useCallback(() => {
    settleCountRef.current = 0;
    if (
      !isLoopRunningRef.current &&
      !isOffScreenRef.current &&
      !isDocHiddenRef.current
    ) {
      isLoopRunningRef.current = true;
      lastTimeRef.current =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      rafIdRef.current = requestAnimationFrame(loop);
    }
  }, [loop]);

  // Synchronize selection changes with 3D neuron highlight & signal burst
  useEffect(() => {
    if (currentSelectedSlug !== lastSelectedSlugRef.current) {
      lastSelectedSlugRef.current = currentSelectedSlug;
      const neuron = currentSelectedSlug
        ? graph.postNeurons.find((n) => n.post?.slug === currentSelectedSlug) ?? null
        : null;
      rendererRef.current?.setSelectedNeuron(neuron);
      kickLoop();
    }
  }, [currentSelectedSlug, graph, kickLoop]);

  // Synchronize active topic filter changes
  useEffect(() => {
    rendererRef.current?.setFilterTopic(activeTopicId ?? null);
    kickLoop();
  }, [activeTopicId, kickLoop]);

  // Main lifecycle: engine setup, observers, and event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Detect prefers-reduced-motion
    const mediaQuery =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    isReducedMotionRef.current = mediaQuery?.matches ?? false;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotionRef.current = e.matches;
      kickLoop();
    };

    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleMotionChange);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handleMotionChange);
      }
    }

    // Initialize ThreeNetworkRenderer
    const renderer = new ThreeNetworkRenderer(canvas, graphConfig);
    renderer.readThemeColorsFromComputedStyle(document.documentElement);
    renderer.setGraph(graph);
    rendererRef.current = renderer;

    // Sync initial selection & topic filter
    if (currentSelectedSlug) {
      const neuron =
        graph.postNeurons.find((n) => n.post?.slug === currentSelectedSlug) ?? null;
      renderer.setSelectedNeuron(neuron);
    }
    if (activeTopicId) {
      renderer.setFilterTopic(activeTopicId);
    }

    // Initial resize sync
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      renderer.resize(
        rect.width,
        rect.height,
        Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2)
      );
    }

    // ResizeObserver
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          const height = entry.contentRect.height;
          if (width > 0 && height > 0) {
            rendererRef.current?.resize(
              width,
              height,
              Math.min(
                typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
                2
              )
            );
            kickLoop();
          }
        }
      });
      resizeObserver.observe(container);
    }

    // IntersectionObserver to auto-pause off-screen
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          isOffScreenRef.current = !entry.isIntersecting;
          if (entry.isIntersecting) {
            kickLoop();
          } else {
            if (rafIdRef.current) {
              cancelAnimationFrame(rafIdRef.current);
              isLoopRunningRef.current = false;
            }
          }
        }
      });
      intersectionObserver.observe(container);
    }

    // Page visibility change listener to pause when backgrounded
    const handleVisibilityChange = () => {
      isDocHiddenRef.current = document.hidden;
      if (document.hidden) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          isLoopRunningRef.current = false;
        }
      } else {
        kickLoop();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("visibilitychange", handleVisibilityChange);

    // Theme change observer
    let themeObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      themeObserver = new MutationObserver(() => {
        rendererRef.current?.readThemeColorsFromComputedStyle(
          document.documentElement
        );
        kickLoop();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme", "class"],
      });
    }

    // Start render loop
    kickLoop();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      isLoopRunningRef.current = false;
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      themeObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("visibilitychange", handleVisibilityChange);

      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === "function") {
          mediaQuery.removeEventListener("change", handleMotionChange);
        } else if (typeof mediaQuery.removeListener === "function") {
          mediaQuery.removeListener(handleMotionChange);
        }
      }

      renderer.dispose();
      rendererRef.current = null;
    };
  }, [graph, kickLoop]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pointer event handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    const rect = canvas.getBoundingClientRect();
    renderer.setCursor(e.clientX, e.clientY, rect);

    const hit = renderer.pickNeuron(e.clientX, e.clientY, rect);
    canvas.style.cursor = hit ? "pointer" : "default";

    kickLoop();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    const rect = canvas.getBoundingClientRect();
    const hit = renderer.pickNeuron(e.clientX, e.clientY, rect);

    if (hit && hit.post) {
      handleSelectPost(hit.post.slug);
      renderer.setSelectedNeuron(hit);

      const idx = interactivePostNeurons.findIndex((n) => n.id === hit.id);
      if (idx !== -1) {
        focusedNeuronIndexRef.current = idx;
      }
    }

    kickLoop();
  };

  const handlePointerLeave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = "default";
    }
  };

  // Keyboard accessibility handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (interactivePostNeurons.length === 0) return;

    const len = interactivePostNeurons.length;

    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight": {
        e.preventDefault();
        const nextIndex =
          focusedNeuronIndexRef.current < 0
            ? 0
            : (focusedNeuronIndexRef.current + 1) % len;
        focusedNeuronIndexRef.current = nextIndex;
        kickLoop();
        break;
      }
      case "ArrowUp":
      case "ArrowLeft": {
        e.preventDefault();
        const prevIndex =
          focusedNeuronIndexRef.current <= 0
            ? len - 1
            : (focusedNeuronIndexRef.current - 1) % len;
        focusedNeuronIndexRef.current = prevIndex;
        kickLoop();
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        const currentIndex = focusedNeuronIndexRef.current;
        if (currentIndex >= 0 && currentIndex < len) {
          const neuron = interactivePostNeurons[currentIndex];
          if (neuron?.post) {
            handleSelectPost(neuron.post.slug);
            rendererRef.current?.setSelectedNeuron(neuron);
            kickLoop();
          }
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        handleSelectPost(null);
        rendererRef.current?.setSelectedNeuron(null);
        focusedNeuronIndexRef.current = -1;
        kickLoop();
        break;
      }
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-[clamp(440px,68vh,640px)] border border-line rounded-2xl bg-surf overflow-hidden touch-pan-y",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        role="region"
        tabIndex={0}
        aria-label={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 w-full h-full cursor-default focus:outline-none focus:ring-2 focus:ring-lime focus:ring-inset"
      />

      {/* Floating post preview card when post is selected */}
      {selectedPost && (
        <PostPreviewCard
          post={selectedPost}
          onClose={() => handleSelectPost(null)}
        />
      )}
    </div>
  );
}
