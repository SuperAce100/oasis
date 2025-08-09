"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TopBarProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function TopBar({ className, title = "Oasis OS", ...props }: TopBarProps) {
  const [time, setTime] = React.useState<string>("");

  React.useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-9 border-b border-border bg-muted/70 text-muted-foreground",
        "backdrop-blur supports-[backdrop-filter]:bg-muted/50",
        "flex items-center px-3"
      , className)}
      {...props}
    >
      <div className="flex items-center gap-2 text-foreground">
        <span className="size-3 rounded-sm bg-foreground/80" aria-hidden />
        <span className="text-xs font-semibold tracking-wide">{title}</span>
      </div>
      <div className="mx-auto text-[11px] font-medium opacity-80">Desktop</div>
      <div className="ml-auto text-[11px] font-medium tabular-nums opacity-80 min-w-10 text-right">
        {time}
      </div>
    </div>
  );
}

export default TopBar;


