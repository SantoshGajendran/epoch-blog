import { z } from "zod";

export const topicSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  colorToken: z.string().regex(/^--[a-z0-9-]+$/),
  lightColor: z.string(),
  darkColor: z.string(),
  clusterPosition: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  description: z.string(),
});

export const topicsConfigSchema = z.object({
  topics: z.array(topicSchema),
});

export type Topic = z.infer<typeof topicSchema>;
export type TopicsConfig = z.infer<typeof topicsConfigSchema>;
