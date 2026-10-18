import type { Topic } from "@config/schemas/topics";
import type { GraphConfig } from "@config/schemas/graph";
import type { Post } from "@/lib/content";

export type TopicConfigItem = Topic;
export type { GraphConfig, Post };

/**
 * Represents a single node (neuron) in the neural network graph.
 * Can be either an interactive post node or a decorative structural node.
 */
export interface Neuron {
  id: string;
  topicId: string;
  clusterIndex: number;
  layer: number;
  row: number;
  rowCount: number;
  isPost: boolean;
  post?: Post;
  x: number;
  y: number;
  vx: number;
  vy: number;
  f: number;
  born: number;
  out: Connection[];
  ins: Connection[];
}

/**
 * Represents a directed synapse (edge) between two neurons.
 * Can be an intra-cluster layer feed-forward link or an inter-cluster bridge link.
 */
export interface Connection {
  id: string;
  source: Neuron;
  target: Neuron;
  isInterTopic: boolean;
}

/**
 * Represents a single topic cluster containing layered neurons.
 */
export interface TopicCluster {
  topic: TopicConfigItem;
  clusterIndex: number;
  hub: { x: number; y: number };
  layers: Neuron[][];
  neurons: Neuron[];
}

/**
 * Complete network graph model with flat arrays and indexing maps.
 */
export interface NetworkGraph {
  neurons: Neuron[];
  connections: Connection[];
  clusters: TopicCluster[];
  clustersByTopic: Map<string, TopicCluster>;
  postNeurons: Neuron[];
}

/**
 * Dynamic theme colors extracted from CSS variables for Canvas 2D rendering.
 */
export interface ThemeColors {
  background: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  lime: string;
  line: string;
  topicColors: Record<string, string>;
}

/**
 * Active signal pulse traveling across a connection.
 */
export interface SignalState {
  id: string;
  source: Neuron;
  target: Neuron;
  progress: number; // 0 to 1
  speed: number;
  depth: number;
  isBackprop?: boolean;
}

/**
 * Mouse / pointer interaction state.
 */
export interface MouseState {
  x: number;
  y: number;
  isDown?: boolean;
}

/**
 * Viewport dimensions for physics and rendering calculations.
 */
export interface ViewportDimensions {
  width: number;
  height: number;
}
