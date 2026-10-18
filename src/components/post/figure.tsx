import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface FigureProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  width?: number;
  height?: number;
}

export function Figure({
  src,
  alt,
  caption,
  className,
  width = 1200,
  height = 630,
}: FigureProps) {
  return (
    <figure className={cn("my-8 flex flex-col items-center", className)}>
      <div className="relative w-full overflow-hidden rounded-lg border border-line bg-surf">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full object-cover"
        />
      </div>
      {caption && (
        <figcaption className="mt-2.5 text-center text-xs text-mut">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
