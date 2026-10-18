import { topicsConfig } from "@config/index";
import { computeClusterWidth, computeRowHeight } from "./physics";
import { getSignalTrail } from "./signals";
import type {
  NetworkGraph,
  Neuron,
  ThemeColors,
  SignalState,
  MouseState,
  ViewportDimensions,
  TopicConfigItem,
} from "./types";

/**
 * Ambient star representation for depth parallax.
 */
export interface AmbientStar {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  z: number; // depth scale 0.2 to 1.0
  p: number; // phase offset 0 to 2*PI
}

/**
 * Active expanding ripple on selected neuron.
 */
export interface RippleState {
  neuron: Neuron;
  startTime: number;
}

/**
 * Full state passed to renderer on each frame.
 */
export interface RenderState {
  graph: NetworkGraph;
  signals?: SignalState[];
  mouse?: MouseState;
  selectedNeuron?: Neuron | null;
  selectedPostSlug?: string | null;
  hoveredNeuron?: Neuron | null;
  hoveredPostSlug?: string | null;
  activeTopicId?: string | null;
  isReducedMotion?: boolean;
  dimensions?: ViewportDimensions;
  now?: number;
}

/**
 * Initialization options for NetworkRenderer.
 */
export interface NetworkRendererOptions {
  themeColors?: ThemeColors;
  topics?: TopicConfigItem[];
  isReducedMotion?: boolean;
  starCount?: number;
}

/**
 * Converts a hex color string (#rgb, #rrggbb) to rgba(r, g, b, a).
 */
export function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith("#")) {
    const raw = hex.slice(1);
    let r = 0;
    let g = 0;
    let b = 0;
    if (raw.length === 3) {
      r = parseInt(raw[0] + raw[0], 16);
      g = parseInt(raw[1] + raw[1], 16);
      b = parseInt(raw[2] + raw[2], 16);
    } else if (raw.length >= 6) {
      r = parseInt(raw.slice(0, 2), 16);
      g = parseInt(raw.slice(2, 4), 16);
      b = parseInt(raw.slice(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (hex.startsWith("rgb(")) {
    return hex.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  if (hex.startsWith("rgba(")) {
    return hex.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
  }
  return hex;
}

/**
 * Computes opacity dimming factor based on active topic filter.
 * Returns 1.0 if no filter or matching topic, 0.14 if dimmed.
 */
export function computeNeuronDim(
  neuron: Neuron,
  activeTopicId?: string | null
): number {
  if (!activeTopicId || neuron.topicId === activeTopicId) {
    return 1.0;
  }
  return 0.14;
}

/**
 * Computes neuron intro visibility from birth time over 600ms.
 * Snaps to 1.0 under reduced motion.
 */
export function computeNeuronVisibility(
  neuron: Neuron,
  now: number,
  isReducedMotion: boolean = false
): number {
  if (isReducedMotion || neuron.born <= 0) {
    return 1.0;
  }
  const elapsed = now - neuron.born;
  if (elapsed <= 0) {
    return 0;
  }
  return Math.min(1.0, Math.max(0, elapsed / 600));
}

/**
 * Draws a rounded rectangle path on canvas with compatibility fallback.
 */
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

/**
 * Reads and maps CSS variables from computed styles or DOM elements
 * into a typed ThemeColors object.
 */
export function readThemeColorsFromComputedStyle(
  styleOrElement: CSSStyleDeclaration | Element,
  topics: TopicConfigItem[] = topicsConfig.topics
): ThemeColors {
  let style: CSSStyleDeclaration;
  if ("getPropertyValue" in styleOrElement) {
    style = styleOrElement as CSSStyleDeclaration;
  } else if (
    typeof window !== "undefined" &&
    typeof window.getComputedStyle === "function"
  ) {
    style = window.getComputedStyle(styleOrElement as Element);
  } else {
    style = {
      getPropertyValue: () => "",
    } as unknown as CSSStyleDeclaration;
  }

  const getVar = (name: string, fallback: string): string => {
    const val = style.getPropertyValue(name).trim();
    return val || fallback;
  };

  const topicColors: Record<string, string> = {};
  for (const topic of topics) {
    topicColors[topic.id] = getVar(
      topic.colorToken,
      topic.darkColor || "#6fd3ff"
    );
  }

  return {
    background: getVar("--bg", "#14181c"),
    surface: getVar("--surf", "#1c2227"),
    ink: getVar("--ink", "#e8eef3"),
    muted: getVar("--mut", "#93a1ad"),
    accent: getVar("--a", "#6fd3ff"),
    lime: getVar("--lime", "#c8f43a"),
    line: getVar("--line", "#2b343c"),
    topicColors,
  };
}

/**
 * Canvas 2D Neural Network Map Renderer.
 * High-performance rendering pipeline with DPR capping, parallax starfield,
 * glowing signal trails, cluster containers, burst ripples, and theme integration.
 */
export class NetworkRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 800;
  private height: number = 600;
  private dpr: number = 1;
  private colors: ThemeColors;
  private topics: TopicConfigItem[];
  private stars: AmbientStar[] = [];
  private ripples: RippleState[] = [];
  private lastSelectedNeuron: Neuron | null = null;
  private lastRippleTime: number = 0;
  private cx: number = 0;
  private cy: number = 0;
  private startTime: number = 0;
  private lastGraph: NetworkGraph | null = null;

  constructor(
    canvasOrCtx: HTMLCanvasElement | CanvasRenderingContext2D,
    options?: NetworkRendererOptions
  ) {
    if ("getContext" in canvasOrCtx) {
      this.canvas = canvasOrCtx as HTMLCanvasElement;
      this.ctx = canvasOrCtx.getContext("2d") ?? null;
      if (this.canvas.width) this.width = this.canvas.width;
      if (this.canvas.height) this.height = this.canvas.height;
    } else {
      this.ctx = canvasOrCtx as CanvasRenderingContext2D;
      this.canvas = (canvasOrCtx.canvas as HTMLCanvasElement) ?? null;
      if (this.canvas?.width) this.width = this.canvas.width;
      if (this.canvas?.height) this.height = this.canvas.height;
    }

    this.topics = options?.topics ?? topicsConfig.topics;
    this.colors =
      options?.themeColors ??
      readThemeColorsFromComputedStyle(
        { getPropertyValue: () => "" } as unknown as CSSStyleDeclaration,
        this.topics
      );

    this.startTime =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const starCount = options?.starCount ?? 60;
    this.initStars(starCount);
  }

  private initStars(count: number): void {
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.2 + Math.random() * 0.8,
      p: Math.random() * Math.PI * 2,
    }));
  }

  /**
   * Returns current active ThemeColors.
   */
  getThemeColors(): ThemeColors {
    return this.colors;
  }

  /**
   * Sets current ThemeColors.
   */
  setThemeColors(colors: ThemeColors): void {
    this.colors = colors;
  }

  /**
   * Reads theme colors from computed style or element and updates active colors.
   */
  readThemeColorsFromComputedStyle(
    styleOrElement: CSSStyleDeclaration | Element
  ): ThemeColors {
    const colors = readThemeColorsFromComputedStyle(
      styleOrElement,
      this.topics
    );
    this.setThemeColors(colors);
    return colors;
  }

  /**
   * Returns current DPR.
   */
  getDpr(): number {
    return this.dpr;
  }

  /**
   * Returns current dimensions.
   */
  getDimensions(): ViewportDimensions {
    return { width: this.width, height: this.height };
  }

  /**
   * Returns canvas element if present.
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /**
   * Returns 2D context if present.
   */
  getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  /**
   * Returns last rendered graph.
   */
  getLastGraph(): NetworkGraph | null {
    return this.lastGraph;
  }

  /**
   * Returns ambient stars array.
   */
  getStars(): AmbientStar[] {
    return this.stars;
  }

  private getTopicColor(topicId: string): string {
    return this.colors.topicColors[topicId] || this.colors.accent;
  }

  /**
   * Resizes canvas buffer with device pixel ratio capped at 2.0.
   */
  resize(width: number, height: number, dpr?: number): void {
    const effectiveDpr = Math.min(
      dpr ??
        (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
      2
    );

    this.width = width;
    this.height = height;
    this.dpr = effectiveDpr;

    if (this.canvas) {
      this.canvas.width = Math.round(width * effectiveDpr);
      this.canvas.height = Math.round(height * effectiveDpr);
      if (this.canvas.style) {
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
      }
    }

    if (this.ctx && typeof this.ctx.setTransform === "function") {
      this.ctx.setTransform(effectiveDpr, 0, 0, effectiveDpr, 0, 0);
    }
  }

  /**
   * Hit-tests pointer coordinates against post neurons within hit threshold radius.
   * Ignores decorative neurons and neurons not matching active filter.
   */
  pickNeuron(
    x: number,
    y: number,
    filterTopicId?: string | null,
    graph?: NetworkGraph
  ): Neuron | null {
    const targetGraph = graph ?? this.lastGraph;
    if (!targetGraph) {
      return null;
    }

    let closest: Neuron | null = null;
    let minDistance = 24; // Threshold radius in pixels

    for (const neuron of targetGraph.postNeurons) {
      if (filterTopicId && neuron.topicId !== filterTopicId) {
        continue;
      }

      const dist = Math.hypot(neuron.x - x, neuron.y - y);
      if (dist <= minDistance) {
        minDistance = dist;
        closest = neuron;
      }
    }

    return closest;
  }

  /**
   * Main Canvas 2D render loop execution.
   */
  render(state: RenderState): void {
    this.lastGraph = state.graph;
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }

    const width = state.dimensions?.width ?? this.width;
    const height = state.dimensions?.height ?? this.height;
    if (width <= 0 || height <= 0) {
      return;
    }
    const now =
      state.now ??
      (typeof performance !== "undefined" ? performance.now() : Date.now());

    if (this.startTime === 0) {
      this.startTime = now;
    }

    const isReducedMotion = state.isReducedMotion ?? false;
    const mouse = state.mouse ?? { x: -1000, y: -1000 };
    const live = !isReducedMotion && mouse.x > -900;
    const hi = Math.min(1.0, Math.max(0, (now - this.startTime) / 800));

    // Resolve selected and hovered neurons
    const selected =
      state.selectedNeuron ??
      (state.selectedPostSlug
        ? state.graph.postNeurons.find(
            (n) => n.post?.slug === state.selectedPostSlug
          ) ?? null
        : null);

    const hovered =
      state.hoveredNeuron ??
      (state.hoveredPostSlug
        ? state.graph.postNeurons.find(
            (n) => n.post?.slug === state.hoveredPostSlug
          ) ?? null
        : null);

    // 1. Clear Canvas
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // 2. Ambient Stars with Parallax Drift
    const tx = live ? (mouse.x / width - 0.5) * 2 : 0;
    const ty = live ? (mouse.y / height - 0.5) * 2 : 0;
    this.cx += (tx - this.cx) * 0.06;
    this.cy += (ty - this.cy) * 0.06;

    ctx.fillStyle = this.colors.muted;
    for (const s of this.stars) {
      const sx =
        ((s.x * width +
          (isReducedMotion ? 0 : now * 0.005 * s.z) -
          (isReducedMotion ? 0 : this.cx * s.z * 28)) %
          width +
          width) %
        width;
      const sy =
        ((s.y * height - (isReducedMotion ? 0 : this.cy * s.z * 28)) %
          height +
          height) %
        height;
      const alpha =
        (0.08 +
          0.28 *
            s.z *
            (isReducedMotion ? 0.7 : 0.5 + 0.5 * Math.sin(now * 0.0018 + s.p))) *
        hi;

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.beginPath();
      ctx.arc(sx, sy, 0.5 + s.z * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Pointer Radial Ice-Blue Glow
    if (live) {
      const grad = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        180
      );
      grad.addColorStop(0, hexToRgba(this.colors.accent, 0.16));
      grad.addColorStop(1, hexToRgba(this.colors.accent, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 4. Topic Cluster Containers and Labels
    const cwv = computeClusterWidth(width);
    const syv = computeRowHeight(height);

    for (const cluster of state.graph.clusters) {
      const hx = cluster.hub.x * width;
      const hy = cluster.hub.y * height;
      const color = this.getTopicColor(cluster.topic.id);
      const isFiltered =
        state.activeTopicId && state.activeTopicId !== cluster.topic.id;
      const fa = (isFiltered ? 0.2 : 1.0) * hi;

      // Rounded container outline
      ctx.globalAlpha = fa * 0.28;
      ctx.strokeStyle = color;
      ctx.beginPath();
      drawRoundRect(
        ctx,
        hx - cwv / 2 - 20,
        hy - syv - 26,
        cwv + 40,
        syv * 2 + 52,
        18
      );
      ctx.stroke();

      // Topic title
      ctx.globalAlpha = fa;
      ctx.fillStyle = this.colors.ink;
      ctx.font = '500 15px "Space Grotesk", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(cluster.topic.label, hx, hy - syv - 36);
    }

    // 5. Synapse Connection Lines
    for (const conn of state.graph.connections) {
      const a = conn.source;
      const b = conn.target;
      const isSelected = a === selected || b === selected;
      const dm = Math.min(
        computeNeuronDim(a, state.activeTopicId),
        computeNeuronDim(b, state.activeTopicId)
      );
      const va = computeNeuronVisibility(a, now, isReducedMotion);
      const vb = computeNeuronVisibility(b, now, isReducedMotion);
      const v = Math.min(va, vb);

      const baseAlpha = isSelected ? 0.9 : conn.isInterTopic ? 0.1 : 0.17;
      ctx.globalAlpha = baseAlpha * dm * v;
      ctx.strokeStyle = isSelected
        ? this.colors.accent
        : conn.isInterTopic
        ? this.colors.muted
        : this.getTopicColor(a.topicId);
      ctx.lineWidth = isSelected ? 1.5 : 1;

      if (isSelected && !isReducedMotion) {
        ctx.setLineDash([6, 7]);
        ctx.lineDashOffset = -now * 0.03;
      }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (isSelected && !isReducedMotion) {
        ctx.setLineDash([]);
      }
    }
    ctx.lineWidth = 1;

    // 6. Signal Pulses with Multi-Stage Fading Trails
    if (!isReducedMotion && state.signals && state.signals.length > 0) {
      for (const signal of state.signals) {
        const c = this.getTopicColor(signal.source.topicId);
        const trail = getSignalTrail(signal, 4, 0.04);
        const dm = computeNeuronDim(signal.target, state.activeTopicId);

        for (let m = 0; m < trail.length; m++) {
          const pt = trail[m];
          ctx.globalAlpha = dm * (1 - m * 0.22);
          ctx.fillStyle = c;
          if (m === 0) {
            ctx.shadowColor = c;
            ctx.shadowBlur = 10;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
    }

    // 7. Selected Neuron Burst Ripples
    if (!isReducedMotion && selected) {
      if (
        selected !== this.lastSelectedNeuron ||
        now - this.lastRippleTime > 2400
      ) {
        this.lastSelectedNeuron = selected;
        this.lastRippleTime = now;
        this.ripples.push({ neuron: selected, startTime: now });
        if (this.ripples.length > 4) {
          this.ripples.shift();
        }
      }

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        const g = (now - r.startTime) / 1500;
        if (g > 1) {
          this.ripples.splice(i, 1);
          continue;
        }
        const dm = computeNeuronDim(r.neuron, state.activeTopicId);
        ctx.globalAlpha = (1 - g) * 0.6 * dm;
        ctx.strokeStyle = this.getTopicColor(r.neuron.topicId);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r.neuron.x, r.neuron.y, 8 + g * 48, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    } else if (isReducedMotion) {
      this.ripples = [];
    }

    // 8. Neurons (Post Neurons vs Decorative Neurons)
    for (const o of state.graph.neurons) {
      const v = computeNeuronVisibility(o, now, isReducedMotion);
      if (v <= 0) continue;

      const c = this.getTopicColor(o.topicId);
      const dm = computeNeuronDim(o, state.activeTopicId);
      const isPost = o.isPost;
      const on = isPost && (o === selected || o === hovered);

      const pr =
        live && mouse.x > -900
          ? Math.max(0, 1 - Math.hypot(o.x - mouse.x, o.y - mouse.y) / 140)
          : 0;
      const baseR = isPost ? 6.5 : 3;
      const r =
        baseR *
        (on ? 1.35 : 1) *
        (1 + pr * 0.5) *
        (1 + o.f * 0.5) *
        (0.4 + 0.6 * v);

      if (!isReducedMotion) {
        const blur = (on ? 20 : 0) + 14 * o.f + 8 * pr;
        if (blur > 0) {
          ctx.shadowColor = c;
          ctx.shadowBlur = blur;
        }
      }

      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      ctx.lineWidth = isPost ? 1.6 : 1;

      // Outer ring / body
      ctx.beginPath();
      ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
      ctx.globalAlpha = dm * v * Math.min(1, (isPost ? 0.4 : 0.1) + o.f * 0.6);
      ctx.fill();

      ctx.globalAlpha = dm * v * (isPost ? 1 : 0.55);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Post neuron core
      if (isPost) {
        ctx.globalAlpha = dm * v;
        ctx.beginPath();
        ctx.arc(o.x, o.y, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rotating dashed halo ring on selected/hovered post neuron
      if (on) {
        ctx.globalAlpha = dm * 0.8;
        ctx.setLineDash([4, 4]);
        if (!isReducedMotion) {
          ctx.lineDashOffset = -now * 0.02;
        }
        ctx.beginPath();
        ctx.arc(o.x, o.y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 9. Hover Tooltip
    if (hovered && (hovered.isPost || hovered.post)) {
      const title = hovered.post?.title ?? hovered.id;
      ctx.font = '500 14px "Space Grotesk", system-ui, sans-serif';
      const textWidth = ctx.measureText(title).width;
      const w = textWidth + 20;
      let tx = Math.min(Math.max(hovered.x - w / 2, 8), width - w - 8);
      let ty = hovered.y - 34;
      if (ty < 8) ty = hovered.y + 16;

      ctx.globalAlpha = 1;
      ctx.fillStyle = this.colors.ink;
      ctx.beginPath();
      drawRoundRect(ctx, tx, ty, w, 26, 8);
      ctx.fill();

      ctx.fillStyle = this.colors.background;
      ctx.textAlign = "left";
      ctx.fillText(title, tx + 10, ty + 18);
    }

    // Reset styles
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
  }
}
