"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendIcon, XIcon } from "lucide-react";

export interface AgentPromptProps extends React.HTMLAttributes<HTMLFormElement> {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function AgentPrompt({
  value,
  onChange,
  onSubmit,
  onCancel,
  className,
  ...props
}: AgentPromptProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (!q) return;
        onSubmit(q);
      }}
      className={
        "flex w-full flex-col gap-3 rounded-2xl border bg-white/70 p-2 shadow-xl backdrop-blur-lg " +
        (className ?? "")
      }
      {...props}
    >
      <div className="flex flex-col gap-2 px-3 py-1">
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }
          }}
          placeholder="What would you like to do?"
          className="w-full rounded-none border-none hover:border-none shadow-none p-0 px-0 py-0 bg-transparent hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
        />
      </div>
      <div className="flex items-end justify-between">
        <div className="ml-1 text-xs text-muted-foreground">Press Enter to run • Esc to close</div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="iconLg" onClick={onCancel}>
            <XIcon />
          </Button>
          <Button type="submit" variant="default" size="iconLg">
            <SendIcon />
          </Button>
        </div>
      </div>
    </form>
  );
}

export default AgentPrompt;
