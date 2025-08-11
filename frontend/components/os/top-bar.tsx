"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import Logo from "../logo";

export interface TopBarProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function TopBar({ className, title = "Oasis", ...props }: TopBarProps) {
  const [time, setTime] = React.useState<string>("");

  React.useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-8 bg-none text-white",
        "animate-in fade-in-0 slide-in-from-top-translate-full duration-1000",
        "flex items-center px-3 justify-between",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 pt-2">
        <Logo className="size-7" />
        <span className="text-2xl font-semibold tracking-tight">{title}</span>
      </div>
      <div className="text-2xl font-medium tabular-nums opacity-80 min-w-10 text-right">{time}</div>
    </div>
  );
}

export default TopBar;
