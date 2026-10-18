import { z } from "zod";

export const siteConfigSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  url: z.string().url(),
  author: z.object({
    name: z.string().min(1),
    bio: z.string().min(1),
    avatar: z.string().optional(),
    twitter: z.string().optional(),
    github: z.string().optional(),
  }),
  ui: z.object({
    searchPlaceholder: z.string(),
    searchButtonLabel: z.string(),
    searchAriaLabel: z.string(),
    themeToggleAriaLabel: z.string(),
    allTopicsLabel: z.string(),
    mapViewLabel: z.string(),
    listViewLabel: z.string(),
    prototypeHint: z.string(),
    readPostLabel: z.string(),
    minReadSuffix: z.string(),
    noSearchResultsLabel: z.string(),
  }),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
