"use client";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { siteConfig } from "@config/index";
import { Search } from "lucide-react";
import { useOptionalSearchPalette } from "@/lib/search/search-provider";

export function Header() {
  const search = useOptionalSearchPalette();

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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
