import { z } from "zod";

export const interTopicLinkSchema = z.object({
  sourceTopic: z.string(),
  targetTopic: z.string(),
  sourceLayer: z.number(),
  targetLayer: z.number(),
  mode: z.enum(["all-to-all", "one-to-one"]),
});

export const graphConfigSchema = z.object({
  clusterLayers: z.array(z.number()),
  postsLayerIndex: z.number(),
  interTopicLinks: z.array(interTopicLinkSchema),
  signals: z.object({
    spawnIntervalMs: z.number().positive(),
    spawnProbability: z.number().min(0).max(1),
    speedRange: z.tuple([z.number().positive(), z.number().positive()]),
    trailLength: z.number().int().positive(),
    maxDepth: z.number().int().positive(),
    maxConcurrent: z.number().int().positive(),
    fireBurstIntervalMs: z.number().positive(),
  }),
  physics: z.object({
    spring: z.number().positive(),
    damping: z.number().positive(),
    cursorRepulsionRadius: z.number().positive(),
    cursorRepulsionForce: z.number().positive(),
  }),
  animation: z.object({
    introDurationMs: z.number().positive(),
    clusterStaggerMs: z.number().positive(),
    layerStaggerMs: z.number().positive(),
    rowStaggerMs: z.number().positive(),
  }),
  three: z.object({
    cameraFov: z.number().positive(),
    depthSpread: z.number().positive(),
    tiltSensitivity: z.number().positive(),
    ambientDriftSpeed: z.number().positive(),
  }),
});

export type GraphConfig = z.infer<typeof graphConfigSchema>;
