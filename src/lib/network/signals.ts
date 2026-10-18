import type {
  NetworkGraph,
  Neuron,
  SignalState,
  GraphConfig,
} from "./types";

export interface SignalTrailPoint {
  x: number;
  y: number;
  progress: number;
  alpha: number;
  radius: number;
}

type SignalsConfig = GraphConfig["signals"];

let globalSignalIdCounter = 0;

/**
 * Manages signal pulse lifecycle, cascades, ambient spawning, and burst propagation.
 * Pure mathematical engine with zero DOM/React dependencies.
 */
export class SignalSystem {
  public signals: SignalState[] = [];
  public config: SignalsConfig;

  constructor(config: GraphConfig | SignalsConfig) {
    this.config = "signals" in config ? config.signals : config;
  }

  /**
   * Returns currently active signal pulses.
   */
  get activeSignals(): SignalState[] {
    return this.signals;
  }

  /**
   * Clears all active signals.
   */
  clear(): void {
    this.signals = [];
  }

  /**
   * Spawns an ambient signal pulse from a random input neuron (layer 0)
   * along one of its outgoing connections.
   *
   * Returns the created SignalState, or null if concurrency limit is reached
   * or reduced motion is active.
   */
  spawnAmbientSignal(
    graph: NetworkGraph,
    isReducedMotion: boolean = false
  ): SignalState | null {
    if (isReducedMotion || this.signals.length >= this.config.maxConcurrent) {
      return null;
    }

    const inputNeurons = graph.neurons.filter(
      (n) => n.layer === 0 && n.out.length > 0
    );

    if (inputNeurons.length === 0) {
      return null;
    }

    const source =
      inputNeurons[Math.floor(Math.random() * inputNeurons.length)];
    const conn =
      source.out[Math.floor(Math.random() * source.out.length)];

    const [minSpeed, maxSpeed] = this.config.speedRange;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

    const signal: SignalState = {
      id: `sig-${++globalSignalIdCounter}-${Date.now()}`,
      source,
      target: conn.target,
      progress: 0,
      speed,
      depth: 0,
      stop: false,
    };

    this.signals.push(signal);
    return signal;
  }

  /**
   * Fires a burst of signals along all incoming and outgoing connections
   * for a given neuron (e.g. upon selection or click).
   *
   * Signals have stop: true so they terminate upon arrival and do not cascade.
   */
  fireBurst(neuron: Neuron, isReducedMotion: boolean = false): SignalState[] {
    if (isReducedMotion) {
      return [];
    }

    neuron.f = 1;

    const [minSpeed, maxSpeed] = this.config.speedRange;
    const burstSpeed = (minSpeed + maxSpeed) / 2;
    const spawned: SignalState[] = [];

    // Incoming pulses (backpropagation flow into neuron)
    for (const conn of neuron.ins) {
      spawned.push({
        id: `sig-burst-in-${++globalSignalIdCounter}-${Date.now()}`,
        source: conn.source,
        target: neuron,
        progress: 0,
        speed: burstSpeed,
        depth: 0,
        stop: true,
        isBackprop: true,
      });
    }

    // Outgoing pulses (forward flow away from neuron)
    for (const conn of neuron.out) {
      spawned.push({
        id: `sig-burst-out-${++globalSignalIdCounter}-${Date.now()}`,
        source: neuron,
        target: conn.target,
        progress: 0,
        speed: burstSpeed,
        depth: 0,
        stop: true,
        isBackprop: false,
      });
    }

    // Enforce maxConcurrent limit by trimming oldest signals if necessary
    const totalCount = this.signals.length + spawned.length;
    if (totalCount > this.config.maxConcurrent) {
      const excess = totalCount - this.config.maxConcurrent;
      this.signals.splice(0, excess);
    }

    this.signals.push(...spawned);
    return spawned;
  }

  /**
   * Steps signal progress forward in time.
   * - Steps signal progress by (speed * dt / 16).
   * - Upon arrival (progress >= 1): flashes target neuron (target.f = 1),
   *   removes finished signal, and cascades to outgoing connection if depth < maxDepth
   *   and active count < maxConcurrent.
   * - Under isReducedMotion: wipes all signals immediately.
   */
  updateSignals(
    dt: number,
    _graph: NetworkGraph,
    isReducedMotion: boolean = false
  ): void {
    if (isReducedMotion) {
      this.signals = [];
      return;
    }

    const [minSpeed, maxSpeed] = this.config.speedRange;

    for (let i = this.signals.length - 1; i >= 0; i--) {
      const signal = this.signals[i];
      signal.progress += (signal.speed * dt) / 16;

      if (signal.progress >= 1) {
        // Flash target neuron
        signal.target.f = 1;

        // Remove arrived signal
        this.signals.splice(i, 1);

        // Cascade to outgoing connection if allowed
        if (
          !signal.stop &&
          signal.target.out.length > 0 &&
          signal.depth < this.config.maxDepth &&
          this.signals.length < this.config.maxConcurrent
        ) {
          const nextConn =
            signal.target.out[
              Math.floor(Math.random() * signal.target.out.length)
            ];
          const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

          const cascadedSignal: SignalState = {
            id: `sig-casc-${++globalSignalIdCounter}-${Date.now()}`,
            source: signal.target,
            target: nextConn.target,
            progress: 0,
            speed,
            depth: signal.depth + 1,
            stop: false,
          };

          this.signals.push(cascadedSignal);
        }
      }
    }
  }
}

/**
 * Computes multi-stage trailing points for a signal traveling from source to target.
 * Matches prototype 4-stage fading trail with decreasing alpha and radius.
 */
export function getSignalTrail(
  signal: SignalState,
  trailLength: number = 4,
  stepOffset: number = 0.04
): SignalTrailPoint[] {
  const points: SignalTrailPoint[] = [];

  for (let m = 0; m < trailLength; m++) {
    const u = signal.progress - m * stepOffset;
    if (u < 0) {
      break;
    }

    const x = signal.source.x + (signal.target.x - signal.source.x) * u;
    const y = signal.source.y + (signal.target.y - signal.source.y) * u;
    const alpha = Math.max(0, 1 - m * 0.22);
    const radius = Math.max(0.5, 2.4 - m * 0.4);

    points.push({
      x,
      y,
      progress: u,
      alpha,
      radius,
    });
  }

  return points;
}
