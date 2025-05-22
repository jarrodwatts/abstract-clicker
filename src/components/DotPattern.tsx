"use client";

import { cn } from "@/lib/utils";

interface DotPatternProps {
  className?: string;
}

export function DotPattern({ className }: DotPatternProps) {
  return (
    <svg
      className={cn(
        "absolute inset-0 h-full w-full stroke-gray-900/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] -z-100",
        className
      )}
    >
      <defs>
        <pattern
          id="dot-pattern"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
          x="-1"
          y="-1"
        >
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        strokeWidth="0"
        fill="url(#dot-pattern)"
      />
    </svg>
  );
}
