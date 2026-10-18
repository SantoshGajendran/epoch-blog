import { z } from "zod";

export const navItemSchema = z.object({
  label: z.string().min(1),
  href: z.string(),
  external: z.boolean().optional(),
});

export const navConfigSchema = z.object({
  mainNav: z.array(navItemSchema),
});

export type NavConfig = z.infer<typeof navConfigSchema>;
