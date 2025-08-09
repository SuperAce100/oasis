"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface DockItem {
  id: string;
  label: string;
  iconSrc: string;
  onClick?: () => void;
}

export interface DockProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: DockItem[];
}

export function Dock({ className, items = [], ...props }: DockProps) {
  return (
    <div
      className={cn(
        "fixed bottom-1 left-1/2 -translate-x-1/2 z-40",
        "rounded-2xl bg-foreground/10 shadow-lg",
        "backdrop-blur supports-[backdrop-filter]:bg-foreground/20",
        "px-1 py-1 h-16",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-center h-full">
        {items.map((item, index) => {
          return (
            <button
              key={item.id}
              title={item.label}
              className={cn(
                "relative grid place-items-center transition-all duration-300",
                "rounded-lg active:brightness-95",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring hover:scale-110 hover:-translate-y-1 group"
              )}
              onClick={item.onClick}
            >
              <Image
                src={item.iconSrc}
                alt={item.label}
                width={60}
                height={60}
                className="drop-shadow-sm"
              />
              <div
                className={cn(
                  "pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100",
                  "rounded-md bg-foreground/70 px-2 py-0.5 backdrop-blur-sm text-[10px] text-white",
                  "transition-opacity"
                )}
              >
                {item.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Dock;
