"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import Logo from "../logo";

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
        "fixed top-0 left-0 right-0 z-50 h-8 bg-foreground/10 text-white",
        "backdrop-blur supports-[backdrop-filter]:bg-foreground/20",
        "flex items-center px-3"
      , className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <Logo className="size-4" />
        <span className="text0-md font-semibold tracking-tight">{title}</span>
      </div>
      <div className="mx-auto text-sm font-medium opacity-80">Desktop</div>
      <div className="text-sm font-medium tabular-nums opacity-80 min-w-10 text-right">
        {time}
      </div>
    </div>
  );
}

export default TopBar;


