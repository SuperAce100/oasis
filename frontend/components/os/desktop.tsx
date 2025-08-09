"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { WindowContainer } from "./window";

export interface DesktopProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Desktop({ className, children, ...props }: DesktopProps) {
  return (
    <div
      className={cn(
        "relative w-full h-full pt-8 pb-18",
        "bg-[url('/background.jpg')] bg-cover bg-center",
        className
      )}
      {...props}
    >
        <WindowContainer className="w-full h-full">
            {children}
        </WindowContainer>
    </div>
  );
}

export default Desktop;


