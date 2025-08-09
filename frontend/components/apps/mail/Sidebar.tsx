"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { ComposeDialog } from "./ComposeDialog";
import { MessageList } from "./MessageList";
import { Archive, Inbox, Mail, Search, Send, Trash2 } from "lucide-react";
import type { EmailSummary, OrderBy } from "./types";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function Sidebar(props: {
  query: string;
  setQuery: (q: string) => void;
  folderId: string;
  setFolderId: (id: string) => void;
  unreadOnly: boolean;
  setUnreadOnly: (v: boolean) => void;
  orderBy: OrderBy;
  setOrderBy: (o: OrderBy) => void;
  emails: EmailSummary[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefreshAfterSend: () => Promise<void> | void;
}) {
  const {
    query,
    setQuery,
    folderId,
    setFolderId,
    unreadOnly,
    setUnreadOnly,
    orderBy,
    setOrderBy,
    emails,
    isLoading,
    error,
    selectedId,
    onSelect,
    onRefreshAfterSend,
  } = props;

  return (
    <aside className="col-span-4 overflow-hidden flex flex-col">
      <div className="px-2 py-2 flex items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search mail"
            className="pl-8 rounded-xl"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <nav className="px-2 pb-2 flex gap-2 justify-between">
        <ComposeDialog
          onSent={async () => {
            await onRefreshAfterSend();
            setFolderId("sent");
          }}
        />
        <Button
          onClick={() => setFolderId("inbox")}
          variant="outline"
          className={cn(folderId === "inbox" && "bg-primary/10 border-primary/50")}
          size="iconLg"
        >
          <Inbox className="size-4" />
        </Button>
        <Button
          onClick={() => setFolderId("sent")}
          variant="outline"
          className={cn(folderId === "sent" && "bg-primary/10 border-primary/50")}
          size="iconLg"
        >
          <Send className="size-4" />
        </Button>
        <Button
          onClick={() => setFolderId("archive")}
          variant="outline"
          className={cn(folderId === "archive" && "bg-primary/10 border-primary/50")}
          size="iconLg"
        >
          <Archive className="size-4" />
        </Button>
        <Button
          onClick={() => setFolderId("trash")}
          variant="outline"
          className={cn(folderId === "trash" && "bg-primary/10 border-primary/50")}
          size="iconLg"
        >
          <Trash2 className="size-4" />
        </Button>
      </nav>
      <div className="px-2 pb-2 flex items-center gap-2 text-xs">
        <label className="flex items-center gap-2 select-none">
          <Checkbox checked={unreadOnly} onCheckedChange={(checked) => setUnreadOnly(!!checked)} />
          Unread
        </label>
        <Select value={orderBy} onValueChange={(value) => setOrderBy(value as OrderBy)}>
          <SelectTrigger>
            <SelectValue placeholder="Select an order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="receivedDateTime">Newest</SelectItem>
            <SelectItem value="subject">Subject</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-auto px-2 pb-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
            Loading…
          </div>
        ) : error ? (
          <div className="text-sm text-destructive p-2">{error}</div>
        ) : emails.length === 0 ? (
          <div className="text-sm text-muted-foreground p-2">No messages</div>
        ) : (
          <MessageList emails={emails} selectedId={selectedId} onSelect={onSelect} />
        )}
      </div>
    </aside>
  );
}
