import type {
  NetworkGraph,
  Neuron,
  MouseState,
  ViewportDimensions,
  GraphConfig,
} from "./types";

/**
 * Computes cluster width clamped between dynamic ratio and max limit.
 * Matches prototype layout geometry (Math.min(W * 0.34, 300)).
 */
export function computeClusterWidth(width: number): number {
  return Math.min(width * 0.34, 300);
}

/**
 * Computes vertical row height clamped between dynamic ratio and max limit.
 * Matches prototype layout geometry (Math.min(H * 0.1, 58)).
 */
export function computeRowHeight(height: number): number {
  return Math.min(height * 0.1, 58);
}

/**
 * Computes the target coordinate for a neuron based on cluster center hub,
 * layer horizontal spacing, and row vertical centering, with optional harmonic ambient drift.
 *
 * Under isReducedMotion, drift is eliminated (j = 0) and coordinates are purely static.
 */
export function computeTargetPosition(
  neuron: Neuron,
  hub: { x: number; y: number },
  dimensions: ViewportDimensions,
  now: number,
  isReducedMotion: boolean
): { x: number; y: number } {
  const cw = computeClusterWidth(dimensions.width);
  const sy = computeRowHeight(dimensions.height);

  const hx = hub.x * dimensions.width;
  const hy = hub.y * dimensions.height;

  // Layer horizontal offset: centered across 4 layers (-1.5 to +1.5)
  const layerOffset = (neuron.layer - 1.5) * (cw / 3);

  // Row vertical offset: centered vertically within row count
  const rowOffset = (neuron.row - (neuron.rowCount - 1) / 2) * sy;

  // Harmonic drift amplitude: 0 under reduced motion, 3px standard
  const j = isReducedMotion ? 0 : 3;
  const driftX =
    Math.sin(now * 0.0008 + neuron.clusterIndex * 2 + neuron.layer * 1.3 + neuron.row) * j;
  const driftY =
    Math.cos(now * 0.0009 + neuron.clusterIndex + neuron.layer + neuron.row * 1.7) * j;

  return {
    x: hx + layerOffset + driftX,
    y: hy + rowOffset + driftY,
  };
}

/**
 * Initial setup for neuron positions.
 * In reduced motion mode, snaps immediately to static target positions.
 * In standard mode, centers all neurons at viewport center to enable intro explosion animation.
 */
export function initNeuronPositions(
  graph: NetworkGraph,
  dimensions: ViewportDimensions,
  isReducedMotion: boolean = false,
  now: number = 0
): void {
  for (const neuron of graph.neurons) {
    const cluster = graph.clusters[neuron.clusterIndex];
    const hub = cluster ? cluster.hub : { x: 0.5, y: 0.5 };
    const target = computeTargetPosition(neuron, hub, dimensions, now, isReducedMotion);

    if (isReducedMotion) {
      neuron.x = target.x;
      neuron.y = target.y;
    } else {
      neuron.x = dimensions.width / 2;
      neuron.y = dimensions.height / 2;
    }
    neuron.vx = 0;
    neuron.vy = 0;
    neuron.f = 0;
  }
}

/**
 * Applies a momentary radial impulse away from a center point (e.g. on post click).
 */
export function applyImpulse(
  graph: NetworkGraph,
  origin: { x: number; y: number },
  force: number = 4,
  radius: number = 180
): void {
  for (const neuron of graph.neurons) {
    const dx = neuron.x - origin.x;
    const dy = neuron.y - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0 && dist < radius) {
      const impulse = (1 - dist / radius) * force;
      neuron.vx += (dx / dist) * impulse;
      neuron.vy += (dy / dist) * impulse;
    }
  }
}

/**
 * Updates physics simulation across all neurons in the graph.
 * Pure mathematical solver with zero DOM/React dependencies.
 *
 * - Under isReducedMotion: snaps positions to static target positions, zeroes velocities and flash.
 * - Under standard motion:
 *   - Applies spring force pulling neuron toward target position.
 *   - Applies cursor repulsion force within cursorRepulsionRadius.
 *   - Damps velocities by damping factor.
 *   - Integrates velocity into position (x += vx, y += vy).
 *   - Decays flash intensity (f = max(0, f - dt * 0.002)).
 */
export function updatePhysics(
  graph: NetworkGraph,
  mouse: MouseState,
  dimensions: ViewportDimensions,
  config: GraphConfig,
  dt: number,
  now: number,
  isReducedMotion: boolean
): void {
  const isMouseActive =
    !isReducedMotion && mouse && typeof mouse.x === "number" && mouse.x > -900;
  const repulsionRadius = config.physics.cursorRepulsionRadius;
  const repulsionForce = config.physics.cursorRepulsionForce;
  const spring = config.physics.spring;
  const damping = config.physics.damping;

  for (const neuron of graph.neurons) {
    const cluster = graph.clusters[neuron.clusterIndex];
    const hub = cluster ? cluster.hub : { x: 0.5, y: 0.5 };
    const target = computeTargetPosition(neuron, hub, dimensions, now, isReducedMotion);

    if (isReducedMotion) {
      neuron.x = target.x;
      neuron.y = target.y;
      neuron.vx = 0;
      neuron.vy = 0;
      neuron.f = 0;
      continue;
    }

    // 1. Spring force towards target
    neuron.vx += (target.x - neuron.x) * spring;
    neuron.vy += (target.y - neuron.y) * spring;

    // 2. Cursor repulsion
    if (isMouseActive) {
      const mx = neuron.x - mouse.x;
      const my = neuron.y - mouse.y;
      const md = Math.hypot(mx, my);
      if (md < repulsionRadius) {
        const g = (repulsionRadius - md) * repulsionForce;
        neuron.vx += (mx / (md || 1)) * g;
        neuron.vy += (my / (md || 1)) * g;
      }
    }

    // 3. Damping
    neuron.vx *= damping;
    neuron.vy *= damping;

    // 4. Integrate velocity into position
    neuron.x += neuron.vx;
    neuron.y += neuron.vy;

    // 5. Flash decay
    neuron.f = Math.max(0, neuron.f - Math.max(0, dt) * 0.002);
  }
}
