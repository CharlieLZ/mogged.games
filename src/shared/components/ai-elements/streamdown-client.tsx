"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const StreamdownDynamic = dynamic(
  // 配合 next.config.mjs 的别名，强制走 streamdown 的 ESM 入口，避免 Next 误用 CJS 去 require 只提供 ESM 的 shiki
  () => import("streamdown").then((mod) => mod.Streamdown),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground text-sm">内容加载中...</div>
    ),
  }
);

export type StreamdownClientProps = ComponentProps<typeof StreamdownDynamic>;

export function StreamdownClient({
  controls,
  ...props
}: StreamdownClientProps) {
  const mergedControls =
    controls === undefined || controls === true
      ? { mermaid: false, code: true, table: true }
      : controls === false
        ? false
        : { mermaid: false, ...controls };

  return <StreamdownDynamic controls={mergedControls} {...props} />;
}
