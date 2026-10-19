"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { AudioVisualizer } from "./audio-visualizer";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { siteConfig } from "@config/index";
import { Search, Volume2, VolumeX } from "lucide-react";
import { useOptionalSearchPalette } from "@/lib/search/search-provider";
import { useOptionalSound } from "@/lib/audio";
import { cn } from "@/lib/utils";

function useSafePathname(): string {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePathname() || "";
  } catch {
    return "";
  }
}

export function Header() {
  const search = useOptionalSearchPalette();
  const sound = useOptionalSound();
  const isSoundEnabled = sound?.isSoundEnabled ?? false;
  const pathname = useSafePathname();
  const isLearnActive = pathname.startsWith("/learn");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-5">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link
              href="/learn"
              className={cn(
                "font-mono text-sm px-2.5 py-1 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime",
                isLearnActive
                  ? "text-lime font-medium bg-lime/10"
                  : "text-mut hover:text-ink"
              )}
            >
              {siteConfig.ui.navLearnLabel}
            </Link>
          </nav>
        </div>
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
