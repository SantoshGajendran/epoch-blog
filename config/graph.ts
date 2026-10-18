import { graphConfigSchema, type GraphConfig } from "./schemas/graph";

export const graphConfig: GraphConfig = graphConfigSchema.parse({
  clusterLayers: [2, 3, 0, 2], // 0 indicates dynamic count based on posts
  postsLayerIndex: 2,
  interTopicLinks: [
    {
      sourceTopic: "agents",
      targetTopic: "rag",
      sourceLayer: 3,
      targetLayer: 0,
      mode: "all-to-all",
    },
    {
      sourceTopic: "tune",
      targetTopic: "infra",
      sourceLayer: 3,
      targetLayer: 0,
      mode: "all-to-all",
    },
    {
      sourceTopic: "agents",
      targetTopic: "tune",
      sourceLayer: 1,
      targetLayer: 1,
      mode: "one-to-one",
    },
    {
      sourceTopic: "rag",
      targetTopic: "infra",
      sourceLayer: 1,
      targetLayer: 1,
      mode: "one-to-one",
    },
  ],
  signals: {
    spawnIntervalMs: 16,
    spawnProbability: 0.06,
    speedRange: [0.02, 0.032],
    trailLength: 4,
    maxDepth: 9,
    maxConcurrent: 40,
    fireBurstIntervalMs: 2600,
  },
  physics: {
    spring: 0.04,
    damping: 0.78,
    cursorRepulsionRadius: 90,
    cursorRepulsionForce: 0.01,
  },
  animation: {
    introDurationMs: 600,
    clusterStaggerMs: 160,
    layerStaggerMs: 240,
    rowStaggerMs: 70,
  },
});
