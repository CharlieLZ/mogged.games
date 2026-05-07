"use client";

import * as React from "react";

import { cn } from "@/shared/lib/utils";

/**
 * 精简版的滚动容器，去掉 Radix 内部的状态机，避免在 React 19 + Turbopack 下的重复 setState。
 * 只做一个带 overflow 的 div，并保留 ScrollBar 组件以兼容现有调用。
 */
const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("relative overflow-auto", className)} {...props}>
    {children}
  </div>
));
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
  }
>(({ className, orientation = "vertical", ...props }, ref) => (
  <div
    ref={ref}
    data-orientation={orientation}
    aria-hidden
    className={cn(
      orientation === "vertical" ? "h-full w-2" : "h-2 w-full",
      "pointer-events-none select-none opacity-0 shrink-0",
      className
    )}
    {...props}
  />
));
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
