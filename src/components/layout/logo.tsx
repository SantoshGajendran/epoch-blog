import Link from "next/link";
import { siteConfig } from "@config/index";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 font-bold text-lg tracking-tight text-ink focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span
        aria-hidden="true"
        className="relative block h-3.5 w-3.5 rounded-full border-2 border-primary"
      >
        <span className="absolute inset-[2px] rounded-full bg-lime" />
      </span>
      <span>{siteConfig.name}</span>
    </Link>
  );
}
