"use client";

import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import { topicsConfig, graphConfig } from "@config/index";
import {
  buildNetworkGraph,
  updatePhysics,
  initNeuronPositions,
  applyImpulse,
  SignalSystem,
  NetworkRenderer,
} from "@/lib/network";
import type {
  Neuron,
  MouseState,
  ViewportDimensions,
} from "@/lib/network/types";
import type { Post } from "@/lib/content";
import { cn } from "@/lib/utils";
import { PostPreviewCard } from "./post-preview-card";

export interface NetworkMapProps {
  posts: Post[];
  selectedPostSlug?: string | null;
  onSelectPost?: (slug: string | null) => void;
  activeTopicId?: string | null;
  className?: string;
  ariaLabel?: string;
}

/**
 * Interactive Neural Network Map component.
 * Integrates the pure TypeScript 2D canvas engine with full React lifecycle,
 * keyboard accessibility, pointer hit-testing, responsive resize,
 * and background visibility auto-pause.
 */
export function NetworkMap({
  posts,
  selectedPostSlug,
  onSelectPost,
  activeTopicId,
  className,
  ariaLabel = "Interactive Neural Network Map",
}: NetworkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Uncontrolled fallback if selectedPostSlug is not provided
  const [internalSelectedSlug, setInternalSelectedSlug] = useState<string | null>(null);
  const isControlled = selectedPostSlug !== undefined;
  const currentSelectedSlug = isControlled ? selectedPostSlug : internalSelectedSlug;

  const handleSelectPost = useCallback(
    (slug: string | null) => {
      if (!isControlled) {
        setInternalSelectedSlug(slug);
      }
      onSelectPost?.(slug);
    },
    [isControlled, onSelectPost]
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

  // Interactive post neurons for keyboard cycling
  const interactivePostNeurons = useMemo(() => {
    return graph.postNeurons.filter(
      (n) => n.post && (!activeTopicId || n.topicId === activeTopicId)
    );
  }, [graph, activeTopicId]);

  // Simulation engine refs
  const rendererRef = useRef<NetworkRenderer | null>(null);
  const signalSystemRef = useRef<SignalSystem | null>(null);
  const mouseRef = useRef<MouseState>({ x: -999, y: -999, isDown: false });
  const dimensionsRef = useRef<ViewportDimensions>({ width: 800, height: 600 });
  const isReducedMotionRef = useRef<boolean>(false);
  const isOffScreenRef = useRef<boolean>(false);
  const isDocHiddenRef = useRef<boolean>(false);
  const isLoopRunningRef = useRef<boolean>(false);
  const rafIdRef = useRef<number>(0);
  const hoveredNeuronRef = useRef<Neuron | null>(null);
  const focusedNeuronIndexRef = useRef<number>(-1);
  const settleCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastSelectedSlugRef = useRef<string | null>(null);

  // Core render loop function
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

      const signalSys = signalSystemRef.current;
      const renderer = rendererRef.current;

      if (signalSys && renderer) {
        // Ambient signal spawning
        if (!isReducedMotionRef.current) {
          if (Math.random() < graphConfig.signals.spawnProbability) {
            signalSys.spawnAmbientSignal(graph, isReducedMotionRef.current);
          }
        }

        // Update signals
        signalSys.updateSignals(dt, graph, isReducedMotionRef.current);

        // Update physics
        updatePhysics(
          graph,
          mouseRef.current,
          dimensionsRef.current,
          graphConfig,
          dt,
          time,
          isReducedMotionRef.current
        );

        // Selected neuron
        const selectedNeuron = currentSelectedSlug
          ? graph.postNeurons.find((n) => n.post?.slug === currentSelectedSlug) ?? null
          : null;

        renderer.render({
          graph,
          signals: signalSys.signals,
          mouse: mouseRef.current,
          selectedNeuron,
          selectedPostSlug: currentSelectedSlug,
          hoveredNeuron: hoveredNeuronRef.current,
          activeTopicId,
          isReducedMotion: isReducedMotionRef.current,
          dimensions: dimensionsRef.current,
          now: time,
        });
      }

      // In reduced motion mode, settle after 60 frames to conserve power
      if (!isReducedMotionRef.current || settleCountRef.current++ < 60) {
        rafIdRef.current = requestAnimationFrame(loop);
      } else {
        isLoopRunningRef.current = false;
      }
    },
    [graph, currentSelectedSlug, activeTopicId]
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

  // Synchronize selection changes with radial impulse & signal burst
  useEffect(() => {
    if (currentSelectedSlug !== lastSelectedSlugRef.current) {
      lastSelectedSlugRef.current = currentSelectedSlug;
      if (currentSelectedSlug) {
        const neuron = graph.postNeurons.find(
          (n) => n.post?.slug === currentSelectedSlug
        );
        if (neuron) {
          applyImpulse(graph, { x: neuron.x, y: neuron.y });
          signalSystemRef.current?.fireBurst(neuron, isReducedMotionRef.current);
        }
      }
      kickLoop();
    }
  }, [currentSelectedSlug, graph, kickLoop]);

  // Kick loop on active topic filter changes
  useEffect(() => {
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

    // Initialize SignalSystem and NetworkRenderer
    signalSystemRef.current = new SignalSystem(graphConfig);
    const renderer = new NetworkRenderer(canvas, {
      topics: topicsConfig.topics,
      isReducedMotion: isReducedMotionRef.current,
    });
    renderer.readThemeColorsFromComputedStyle(document.documentElement);
    rendererRef.current = renderer;

    // Initial neuron positions
    initNeuronPositions(
      graph,
      dimensionsRef.current,
      isReducedMotionRef.current,
      typeof performance !== "undefined" ? performance.now() : 0
    );

    // Initial resize sync
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      dimensionsRef.current = { width: rect.width, height: rect.height };
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
            dimensionsRef.current = { width, height };
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

    // Start loop
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

      signalSystemRef.current?.clear();
    };
  }, [graph, kickLoop]);

  // Pointer event handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseRef.current.x = x;
    mouseRef.current.y = y;

    const picked = rendererRef.current.pickNeuron(x, y, activeTopicId, graph);
    hoveredNeuronRef.current = picked;
    canvas.style.cursor = picked ? "pointer" : "default";

    kickLoop();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseRef.current.x = x;
    mouseRef.current.y = y;
    mouseRef.current.isDown = true;

    const picked = rendererRef.current.pickNeuron(x, y, activeTopicId, graph);
    if (picked) {
      applyImpulse(graph, { x: picked.x, y: picked.y });
      signalSystemRef.current?.fireBurst(picked, isReducedMotionRef.current);

      if (picked.post) {
        handleSelectPost(picked.post.slug);
        const idx = interactivePostNeurons.findIndex((n) => n.id === picked.id);
        if (idx !== -1) {
          focusedNeuronIndexRef.current = idx;
        }
      }
    }

    kickLoop();
  };

  const handlePointerUp = () => {
    mouseRef.current.isDown = false;
  };

  const handlePointerLeave = () => {
    const canvas = canvasRef.current;
    mouseRef.current.x = -999;
    mouseRef.current.y = -999;
    mouseRef.current.isDown = false;
    hoveredNeuronRef.current = null;
    if (canvas) {
      canvas.style.cursor = "default";
    }
    kickLoop();
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
        hoveredNeuronRef.current = interactivePostNeurons[nextIndex];
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
        hoveredNeuronRef.current = interactivePostNeurons[prevIndex];
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
            applyImpulse(graph, { x: neuron.x, y: neuron.y });
            signalSystemRef.current?.fireBurst(neuron, isReducedMotionRef.current);
            kickLoop();
          }
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        handleSelectPost(null);
        hoveredNeuronRef.current = null;
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
        onPointerUp={handlePointerUp}
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
