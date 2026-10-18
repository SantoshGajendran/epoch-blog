"use client";

import * as React from "react";
import { ChevronDown, AlignLeft } from "lucide-react";
import { siteConfig } from "@config/index";
import { cn } from "@/lib/utils";

export interface TocItem {
  title: string;
  url: string;
  items?: TocItem[];
}

export interface TableOfContentsProps {
  toc?: TocItem[];
  className?: string;
}

export function TableOfContents({ toc, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = React.useState<string>("");
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!toc || toc.length === 0) return;

    const extractIds = (items: TocItem[]): string[] => {
      let ids: string[] = [];
      for (const item of items) {
        if (item.url && item.url.startsWith("#")) {
          ids.push(item.url.slice(1));
        }
        if (item.items) {
          ids = ids.concat(extractIds(item.items));
        }
      }
      return ids;
    };

    const ids = extractIds(toc);
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "0px 0px -60% 0px",
        threshold: 0.1,
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  if (!toc || toc.length === 0) return null;

  const renderItems = (items: TocItem[], level = 0) => {
    return (
      <ul className={cn("space-y-2 text-xs", level > 0 && "pl-3 mt-2 border-l border-line/60")}>
        {items.map((item, idx) => {
          const id = item.url.startsWith("#") ? item.url.slice(1) : "";
          const isActive = id === activeId;

          return (
            <li key={idx}>
              <a
                href={item.url}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block py-0.5 leading-snug transition-colors focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "font-medium text-primary"
                    : "text-mut hover:text-ink"
                )}
              >
                {item.title}
              </a>
              {item.items && item.items.length > 0 && renderItems(item.items, level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <nav
      aria-label="Table of contents"
      className={cn("text-ink", className)}
    >
      {/* Mobile Accordion */}
      <div className="lg:hidden my-6 rounded-lg border border-line bg-surf p-3">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-mut cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <AlignLeft className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {siteConfig.ui.tableOfContentsTitle}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", mobileOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        {mobileOpen && <div className="mt-3 pt-3 border-t border-line/60">{renderItems(toc)}</div>}
      </div>

      {/* Desktop Sticky Sidebar */}
      <div className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
        <h4 className="text-xs font-mono uppercase tracking-wider text-mut mb-4 flex items-center gap-2">
          <AlignLeft className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>{siteConfig.ui.tableOfContentsTitle}</span>
        </h4>
        {renderItems(toc)}
      </div>
    </nav>
  );
}
