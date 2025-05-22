"use client";

import { cn } from "@/lib/utils";
import React, { ComponentPropsWithoutRef, useMemo } from "react";

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  return <div className="animate-list-item mx-auto w-full">{children}</div>;
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  maxItems?: number;
}

export const AnimatedList = React.memo(
  ({ children, className, maxItems = 10, ...props }: AnimatedListProps) => {
    const childrenArray = useMemo(
      () => React.Children.toArray(children).slice(0, maxItems),
      [children, maxItems]
    );

    return (
      <div
        className={cn(`flex flex-col items-center gap-4`, className)}
        {...props}
      >
        {childrenArray.map((item) => (
          <AnimatedListItem key={(item as React.ReactElement).key}>
            {item}
          </AnimatedListItem>
        ))}
      </div>
    );
  }
);

AnimatedList.displayName = "AnimatedList";

// Add the CSS animations
const styles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-list-item {
    animation: slideIn 0.3s ease-out forwards;
  }
`;

// Add the styles to the document
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
