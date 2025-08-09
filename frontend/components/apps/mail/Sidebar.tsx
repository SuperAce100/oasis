"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { ComposeDialog } from "./ComposeDialog";
import { FolderButton } from "./FolderButton";
import { MessageList } from "./MessageList";
import { Archive, InboxIcon, Mail, Search, Trash2 } from "lucide-react";
import type { EmailSummary, OrderBy } from "./types";

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
    <aside className="col-span-3 border-r pr-2 overflow-hidden flex flex-col">
      <div className="p-2 flex items-center gap-2">
        <ComposeDialog
          onSent={async () => {
            await onRefreshAfterSend();
            setFolderId("sent");
          }}
        />
      </div>
      <div className="px-2 pb-2 flex items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search mail"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <nav className="px-2 pb-2 grid grid-cols-2 gap-2">
        <FolderButton
          icon={<InboxIcon className="size-4" />}
          active={folderId === "inbox"}
          label="Inbox"
          onClick={() => setFolderId("inbox")}
        />
        <FolderButton
          icon={<Mail className="size-4" />}
          active={folderId === "sent"}
          label="Sent"
          onClick={() => setFolderId("sent")}
        />
        <FolderButton
          icon={<Archive className="size-4" />}
          active={folderId === "archive"}
          label="Archive"
          onClick={() => setFolderId("archive")}
        />
        <FolderButton
          icon={<Trash2 className="size-4" />}
          active={folderId === "trash"}
          label="Trash"
          onClick={() => setFolderId("trash")}
        />
      </nav>
      <div className="px-2 pb-2 flex items-center gap-2 text-xs">
        <label className="flex items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />
          Unread
        </label>
        <select
          className="text-xs rounded-md border bg-transparent px-2 py-1 ml-auto"
          value={orderBy}
          onChange={(e) => setOrderBy(e.target.value as OrderBy)}
        >
          <option value="receivedDateTime">Newest</option>
          <option value="subject">Subject</option>
        </select>
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
