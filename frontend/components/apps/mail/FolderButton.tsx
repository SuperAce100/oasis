"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function FolderButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1 text-sm",
        active ? "bg-primary/10 border-primary/50" : "hover:bg-accent"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
