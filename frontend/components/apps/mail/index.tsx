"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { MessageView } from "./MessageView";
import { AttachmentPill } from "./AttachmentPill";
import { useEmailList, useEmailRead } from "./hooks";
import type { OpenMailEvent } from "@/lib/os-events";
import type { OrderBy } from "./types";

export type MailAppProps = React.HTMLAttributes<HTMLDivElement> & {
  // Accept a JSON string via data-deeplink attribute to avoid prop drilling through Window
  "data-deeplink"?: string;
};

// local UI-only components moved to separate files under this folder

export function MailApp({ className, ...props }: MailAppProps) {
  const [folderId, setFolderId] = React.useState<string>("inbox");
  const [orderBy, setOrderBy] = React.useState<OrderBy>("receivedDateTime");
  const [unreadOnly, setUnreadOnly] = React.useState<boolean>(false);
  const [query, setQuery] = React.useState<string>("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { emails, isLoading, error, refresh } = useEmailList({
    folderId,
    unreadOnly,
    orderBy,
    query,
  });
  const { message, isLoading: isReading } = useEmailRead(selectedId);

  // Apply deeplink when it changes (works if window already open)
  const lastDeeplinkRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    const raw = (props as any)["data-deeplink"] as string | undefined;
    if (!raw || raw === lastDeeplinkRef.current) return;
    lastDeeplinkRef.current = raw;
    try {
      const parsed = JSON.parse(raw) as OpenMailEvent;
      switch (parsed.action) {
        case "read": {
          if (parsed.messageId) setSelectedId(parsed.messageId);
          break;
        }
        case "search": {
          setQuery(parsed.query ?? "");
          setFolderId("inbox");
          setSelectedId(null);
          break;
        }
        case "list": {
          if (parsed.folderId) setFolderId(parsed.folderId);
          if (typeof parsed.unreadOnly === "boolean") setUnreadOnly(parsed.unreadOnly);
          if (parsed.orderBy) setOrderBy(parsed.orderBy);
          setQuery(parsed.query ?? "");
          setSelectedId(null);
          break;
        }
        case "compose": {
          // Future: open compose prefilled. For now, just switch to Sent to reflect action after send
          setFolderId("sent");
          break;
        }
      }
    } catch {
      // ignore malformed deeplink
    }
  }, [props]);

  React.useEffect(() => {
    if (emails.length > 0 && !selectedId) setSelectedId(emails[0].id);
  }, [emails, selectedId]);

  return (
    <div className={cn("w-full h-full", className)} {...props}>
      <Toaster richColors position="top-right" />
      <div className="grid grid-cols-12 gap-3 h-full bg-background">
        <Sidebar
          query={query}
          setQuery={(q) => setQuery(q)}
          folderId={folderId}
          setFolderId={(id) => {
            setFolderId(id);
            setSelectedId(null);
          }}
          unreadOnly={unreadOnly}
          setUnreadOnly={setUnreadOnly}
          orderBy={orderBy}
          setOrderBy={setOrderBy}
          emails={emails}
          isLoading={isLoading}
          error={error}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onRefreshAfterSend={async () => {
            await refresh();
          }}
        />
        <section className="col-span-8 overflow-hidden flex flex-col">
          {selectedId ? (
            isReading ? (
              <div className="flex-1 grid place-items-center text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : message ? (
              <>
                <MessageView message={message} />
                {message.attachments && message.attachments.length > 0 && (
                  <div className="border-t p-3 flex flex-wrap gap-2">
                    {message.attachments.map((a) => (
                      <AttachmentPill key={a.id} attachment={a} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-muted-foreground">Not found</div>
            )
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground">
              Select a message
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
export default MailApp;
