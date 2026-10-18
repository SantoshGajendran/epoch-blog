"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  "data-language"?: string;
  "data-title"?: string;
}

export function CodeBlock({
  children,
  className,
  "data-language": language,
  "data-title": title,
  ...props
}: CodeBlockProps) {
  const preRef = React.useRef<HTMLPreElement>(null);
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    if (!preRef.current) return;
    const code = preRef.current.querySelector("code")?.textContent || preRef.current.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className="group relative my-6 overflow-hidden rounded-lg border border-line bg-surf">
      {(title || language) && (
        <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs font-mono text-mut bg-bg/50">
          <span>{title || language}</span>
          <button
            type="button"
            onClick={copyToClipboard}
            aria-label="Copy code to clipboard"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-surf hover:text-ink transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                <span className="text-lime">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
      <div className="relative">
        {!(title || language) && (
          <button
            type="button"
            onClick={copyToClipboard}
            aria-label="Copy code to clipboard"
            className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded bg-surf/80 border border-line p-1.5 text-xs text-mut opacity-0 group-hover:opacity-100 transition-opacity hover:text-ink cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        )}
        <pre
          ref={preRef}
          className={cn(
            "overflow-x-auto p-4 text-sm font-mono leading-normal text-ink",
            className
          )}
          {...props}
        >
          {children}
        </pre>
      </div>
    </div>
  );
}
