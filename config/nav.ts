import { navConfigSchema, type NavConfig } from "./schemas/nav";

export const navConfig: NavConfig = navConfigSchema.parse({
  mainNav: [],
});
