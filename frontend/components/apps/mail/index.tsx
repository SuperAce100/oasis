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
  const [composeOpen, setComposeOpen] = React.useState<boolean>(false);
  const [composePrefill, setComposePrefill] = React.useState<
    | {
        to?: string[];
        cc?: string[];
        bcc?: string[];
        subject?: string;
        body?: string;
        format?: "text" | "html";
      }
    | undefined
  >(undefined);
  const [composePrefillId, setComposePrefillId] = React.useState<number>(0);
  const { emails, isLoading, error, refresh } = useEmailList({
    folderId,
    unreadOnly,
    orderBy,
    query,
  });
  const { message, isLoading: isReading } = useEmailRead(selectedId);

  // Apply deeplink when it changes (works if window already open)
  const lastDeeplinkRef = React.useRef<string | undefined>(undefined);
  // Sanitize query from deeplinks: remove wrapping quotes and stray edges
  const sanitizeQuery = React.useCallback((q?: string): string => {
    if (!q) return "";
    let s = q.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }
    s = s.replace(/^['\"]+/, "").replace(/['\"]+$/, "");
    return s;
  }, []);

  React.useEffect(() => {
    const raw = (props as any)["data-deeplink"] as string | undefined;
    if (!raw || raw === lastDeeplinkRef.current) return;
    lastDeeplinkRef.current = raw;
    try {
      const parsed = JSON.parse(raw) as OpenMailEvent;
      try {
        // eslint-disable-next-line no-console
        console.debug("[oasis] MailApp received deeplink", parsed);
      } catch {}
      switch (parsed.action) {
        case "read": {
          if (parsed.messageId) setSelectedId(parsed.messageId);
          break;
        }
        case "search": {
          setQuery(sanitizeQuery(parsed.query));
          setFolderId("inbox");
          setSelectedId(null);
          break;
        }
        case "list": {
          if (parsed.folderId) setFolderId(parsed.folderId);
          if (typeof parsed.unreadOnly === "boolean") setUnreadOnly(parsed.unreadOnly);
          if (parsed.orderBy) setOrderBy(parsed.orderBy);
          setQuery(sanitizeQuery(parsed.query));
          setSelectedId(null);
          break;
        }
        case "compose": {
          // Debug
          try {
            // eslint-disable-next-line no-console
            console.debug("[oasis] applying compose prefill", parsed);
          } catch {}
          setComposePrefill({
            to: Array.isArray(parsed.to)
              ? parsed.to
              : parsed.to
              ? [parsed.to as unknown as string]
              : undefined,
            cc: Array.isArray(parsed.cc) ? parsed.cc : undefined,
            bcc: Array.isArray(parsed.bcc) ? parsed.bcc : undefined,
            subject: typeof parsed.subject === "string" ? parsed.subject : undefined,
            body: typeof parsed.body === "string" ? parsed.body : undefined,
            format: parsed.format,
          });
          setComposeOpen(true);
          setComposePrefillId((n) => n + 1);
          break;
        }
      }
    } catch {
      // ignore malformed deeplink
    }
  }, [props, sanitizeQuery]);

  React.useEffect(() => {
    if (emails.length > 0 && !selectedId) setSelectedId(emails[0].id);
  }, [emails, selectedId]);

  return (
    <div className={cn("w-full h-full", className)} {...props}>
      <Toaster richColors position="top-right" />
      <div className="grid grid-cols-12 gap-3 h-full bg-gradient-to-b from-white/40 to-background">
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
          composeOpen={composeOpen}
          onComposeOpenChange={setComposeOpen}
          composePrefill={composePrefill}
          composePrefillId={composePrefillId}
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
