"use client";

import * as React from "react";
import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailSummary } from "./types";
import { formatRelative } from "./utils";

export function MessageList({
  emails,
  selectedId,
  onSelect,
}: {
  emails: EmailSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {emails.map((m) => (
        <li key={m.id}>
          <button
            className={cn(
              "w-full text-left rounded-md p-2 hover:bg-accent",
              selectedId === m.id && "bg-accent"
            )}
            onClick={() => onSelect(m.id)}
          >
            <div className="flex items-center justify-between text-sm font-medium">
              <span className={cn(m.unread && "font-bold")}>{m.from}</span>
              <span className="text-xs text-muted-foreground">
                {formatRelative(m.receivedDateTime)}
              </span>
            </div>
            <div className={cn("text-sm line-clamp-1", m.unread && "font-semibold")}>
              {m.subject}
            </div>
            <div className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-2">
              {m.hasAttachments && (
                <span title="Has attachment">
                  <Paperclip className="size-3" />
                </span>
              )}
              <span className="truncate">{m.preview}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
