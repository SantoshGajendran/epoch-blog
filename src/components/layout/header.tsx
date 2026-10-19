"use client";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { AudioVisualizer } from "./audio-visualizer";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { siteConfig } from "@config/index";
import { Search, Volume2, VolumeX } from "lucide-react";
import { useOptionalSearchPalette } from "@/lib/search/search-provider";
import { useOptionalSound } from "@/lib/audio";

export function Header() {
  const search = useOptionalSearchPalette();
  const sound = useOptionalSound();
  const isSoundEnabled = sound?.isSoundEnabled ?? false;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Logo />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => search?.toggle()}
            aria-label={siteConfig.ui.searchAriaLabel}
            className="cursor-pointer gap-2"
          >
            <Search className="h-3.5 w-3.5 text-mut" aria-hidden="true" />
            <span>{siteConfig.ui.searchButtonLabel}</span>
            <Kbd className="hidden sm:inline-flex">{siteConfig.ui.searchShortcutLabel}</Kbd>
          </Button>
          <AudioVisualizer />
          <Button
            variant="outline"
            size="icon"
            onClick={() => sound?.toggleSound()}
            aria-label={siteConfig.ui.soundToggleAriaLabel}
            title={isSoundEnabled ? siteConfig.ui.soundEnabledLabel : siteConfig.ui.soundDisabledLabel}
            className="cursor-pointer"
          >
            {isSoundEnabled ? (
              <Volume2 className="h-4 w-4 text-primary" aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4 text-mut" aria-hidden="true" />
            )}
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
