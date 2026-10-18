"use client";

import * as React from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@config/index";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title?: string;
  text?: string;
  url?: string;
  className?: string;
}

export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const shareData = {
      title: title || siteConfig.name,
      text: text || siteConfig.description,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard on error/cancellation
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      aria-label={copied ? siteConfig.ui.linkCopiedLabel : siteConfig.ui.sharePostLabel}
      className={cn("cursor-pointer font-sans gap-2 text-xs", className)}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
          <span className="text-lime">{siteConfig.ui.linkCopiedLabel}</span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5 text-mut" aria-hidden="true" />
          <span>{siteConfig.ui.sharePostLabel}</span>
        </>
      )}
    </Button>
  );
}
