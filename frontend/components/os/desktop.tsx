"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DesktopProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Desktop({ className, children, ...props }: DesktopProps) {
  return (
    <div
      data-window-container
      className={cn(
        "relative w-full h-[calc(100vh-2.25rem)] mt-9", // account for 36px top bar height
        "bg-gradient-to-br from-muted/40 to-background",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Desktop;


