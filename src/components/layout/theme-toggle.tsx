"use client";

import { useTheme } from "@/lib/theme/use-theme";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@config/index";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="default"
      onClick={(e) => toggleTheme(e)}
      aria-label={siteConfig.ui.themeToggleAriaLabel}
      className="cursor-pointer font-sans"
    >
      {resolvedTheme === "dark" ? (
        <>
          <Sun className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{siteConfig.ui.themeLightLabel}</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{siteConfig.ui.themeDarkLabel}</span>
        </>
      )}
    </Button>
  );
}
