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
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  return (
    <div
      className={cn(
        "fixed bottom-3 left-1/2 -translate-x-1/2 z-40",
        "rounded-2xl border border-border bg-white/80 shadow-lg shadow-border/60",
        "backdrop-blur supports-[backdrop-filter]:bg-white/60",
        "px-2 py-1"
      , className)}
      {...props}
    >
      <div className="flex items-end gap-2">
        {items.map((item, index) => {
          const isHovered = hoverIndex === index;
          const scale = isHovered ? 1.15 : 1.0;
          return (
            <button
              key={item.id}
              title={item.label}
              className={cn(
                "relative grid place-items-center transition-all duration-150",
                "rounded-lg hover:bg-muted/50 active:brightness-95",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              style={{ transform: `scale(${scale})` }}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex((v) => (v === index ? null : v))}
              onClick={item.onClick}
            >
              <div className="p-2">
                <Image
                  src={item.iconSrc}
                  alt={item.label}
                  width={28}
                  height={28}
                  className="drop-shadow-sm"
                />
              </div>
              <div className={cn(
                "pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2",
                "rounded-md border border-border bg-popover px-2 py-0.5 text-[10px]",
                isHovered ? "opacity-100" : "opacity-0",
                "transition-opacity"
              )}>{item.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Dock;


