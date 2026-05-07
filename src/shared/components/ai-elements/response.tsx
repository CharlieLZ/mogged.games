"use client";

import { cn } from "@/shared/lib/utils";
import { type ComponentProps, memo } from "react";
import { StreamdownClient } from "./streamdown-client";

type ResponseProps = ComponentProps<typeof StreamdownClient>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <StreamdownClient
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
