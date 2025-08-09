"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Paperclip, Send, Search, Loader2, InboxIcon, Archive, Trash2, Mail } from "lucide-react";

type EmailSummary = {
  id: string;
  mailboxId: string;
  folderId: string;
  from: string;
  to: string[];
  subject: string;
  preview: string;
  receivedDateTime: string;
  unread: boolean;
  hasAttachments?: boolean;
};

type EmailAttachment = {
  id: string;
  filename: string;
  mimeType?: string;
  contentBytes: string;
  size?: number;
};

type EmailMessage = EmailSummary & {
  cc?: string[];
  bcc?: string[];
  bodyText?: string;
  bodyHtml?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
};

type OrderBy = "receivedDateTime" | "subject";

export type MailAppProps = React.HTMLAttributes<HTMLDivElement>;

function formatRelative(dateIso: string): string {
  const date = new Date(dateIso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return date.toLocaleDateString();
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

function useEmailList(params: {
  folderId: string;
  unreadOnly: boolean;
  orderBy: OrderBy;
  query: string;
}) {
  const { folderId, unreadOnly, orderBy, query } = params;
  const [emails, setEmails] = React.useState<EmailSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (query.trim().length > 0) {
        const data = await postJSON<EmailSummary[]>("/api/mail/search", {
          query,
          limit: 100,
        });
        setEmails(data);
      } else {
        const data = await postJSON<EmailSummary[]>("/api/mail/list", {
          folderId,
          unreadOnly,
          orderBy,
          limit: 100,
        });
        setEmails(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [folderId, unreadOnly, orderBy, query]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { emails, isLoading, error, refresh };
}

function useEmailRead(messageId: string | null) {
  const [message, setMessage] = React.useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!messageId) {
      setMessage(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await postJSON<EmailMessage>("/api/mail/read", { messageId });
        if (!cancelled) setMessage(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  return { message, isLoading, error };
}

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

  React.useEffect(() => {
    if (emails.length > 0 && !selectedId) setSelectedId(emails[0].id);
  }, [emails, selectedId]);

  return (
    <div className={cn("w-full h-full", className)} {...props}>
      <Toaster richColors position="top-right" />
      <div className="grid grid-cols-12 gap-3 h-full">
        <aside className="col-span-3 border-r pr-2 overflow-hidden flex flex-col">
          <div className="p-2 flex items-center gap-2">
            <ComposeDialog
              onSent={async () => {
                toast.success("Email sent");
                await refresh();
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
              onClick={() => {
                setFolderId("inbox");
                setSelectedId(null);
              }}
            />
            <FolderButton
              icon={<Mail className="size-4" />}
              active={folderId === "sent"}
              label="Sent"
              onClick={() => {
                setFolderId("sent");
                setSelectedId(null);
              }}
            />
            <FolderButton
              icon={<Archive className="size-4" />}
              active={folderId === "archive"}
              label="Archive"
              onClick={() => {
                setFolderId("archive");
                setSelectedId(null);
              }}
            />
            <FolderButton
              icon={<Trash2 className="size-4" />}
              active={folderId === "trash"}
              label="Trash"
              onClick={() => {
                setFolderId("trash");
                setSelectedId(null);
              }}
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
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : error ? (
              <div className="text-sm text-destructive p-2">{error}</div>
            ) : emails.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">No messages</div>
            ) : (
              <ul className="space-y-1">
                {emails.map((m) => (
                  <li key={m.id}>
                    <button
                      className={cn(
                        "w-full text-left rounded-md p-2 hover:bg-accent",
                        selectedId === m.id && "bg-accent"
                      )}
                      onClick={() => setSelectedId(m.id)}
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
            )}
          </div>
        </aside>
        <section className="col-span-9 overflow-hidden flex flex-col">
          {selectedId ? (
            isReading ? (
              <div className="flex-1 grid place-items-center text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : message ? (
              <div className="h-full flex flex-col">
                <header className="border-b p-4">
                  <div className="text-xs text-muted-foreground">From: {message.from}</div>
                  <h2 className="text-lg font-semibold">{message.subject}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">To: {message.to.join(", ")}</Badge>
                    {message.cc && message.cc.length > 0 && (
                      <Badge variant="outline">Cc: {message.cc.join(", ")}</Badge>
                    )}
                    <Badge variant="outline">{formatRelative(message.receivedDateTime)}</Badge>
                    {message.unread === false && <Badge variant="secondary">Read</Badge>}
                  </div>
                </header>
                <article className="prose prose-sm dark:prose-invert max-w-none p-4 overflow-auto">
                  {message.bodyHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm">
                      {message.bodyText ?? message.preview}
                    </pre>
                  )}
                </article>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="border-t p-3 flex flex-wrap gap-2">
                    {message.attachments.map((a) => (
                      <AttachmentPill key={a.id} attachment={a} />
                    ))}
                  </div>
                )}
              </div>
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

function FolderButton({
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

function AttachmentPill({ attachment }: { attachment: EmailAttachment }) {
  const handleDownload = React.useCallback(() => {
    if (!attachment.contentBytes) {
      toast.info("Attachment placeholder only in demo");
      return;
    }
    try {
      const byteCharacters = atob(attachment.contentBytes);
      const byteNumbers = new Array(byteCharacters.length)
        .fill(0)
        .map((_, i) => byteCharacters.charCodeAt(i));
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: attachment.mimeType ?? "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Failed to download attachment");
    }
  }, [attachment]);

  return (
    <Badge variant="outline" className="cursor-pointer" onClick={handleDownload}>
      <Paperclip className="mr-1 size-3" /> {attachment.filename}
    </Badge>
  );
}

function ComposeDialog({ onSent }: { onSent: () => void | Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [to, setTo] = React.useState<string>("");
  const [cc, setCc] = React.useState<string>("");
  const [bcc, setBcc] = React.useState<string>("");
  const [subject, setSubject] = React.useState<string>("");
  const [body, setBody] = React.useState<string>("");
  const [format, setFormat] = React.useState<"text" | "html">("text");
  const [attachments, setAttachments] = React.useState<
    Array<{ filename: string; contentBytes: string; mimeType?: string }>
  >([]);
  const [isSending, setIsSending] = React.useState(false);

  const reset = () => {
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
    setFormat("text");
    setAttachments([]);
  };

  const onFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const reads = Array.from(files).map(async (file) => {
      const buf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      return { filename: file.name, contentBytes: base64, mimeType: file.type };
    });
    const result = await Promise.all(reads);
    setAttachments((prev) => [...prev, ...result]);
  };

  const doSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error("To, subject, and body are required");
      return;
    }
    setIsSending(true);
    try {
      await postJSON<{ id: string; success: boolean }>("/api/mail/send", {
        to: to
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        cc: cc
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        bcc: bcc
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        subject,
        body,
        format,
        attachments,
      });
      toast.success("Sent");
      setOpen(false);
      reset();
      await onSent();
    } catch (e) {
      toast.error("Failed to send");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Send className="size-4" /> Compose
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            placeholder="To (comma separated)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Cc" value={cc} onChange={(e) => setCc(e.target.value)} />
            <Input placeholder="Bcc" value={bcc} onChange={(e) => setBcc(e.target.value)} />
          </div>
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Format</div>
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="fmt"
                  checked={format === "text"}
                  onChange={() => setFormat("text")}
                />{" "}
                Text
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="fmt"
                  checked={format === "html"}
                  onChange={() => setFormat("html")}
                />{" "}
                HTML
              </label>
            </div>
          </div>
          <Textarea
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={format === "html" ? "<p>Hello</p>" : "Hello"}
          />
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="file"
                multiple
                onChange={(e) => void onFilesSelected(e.currentTarget.files)}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 border rounded-md px-2 py-1 text-xs hover:bg-accent">
                <Paperclip className="size-4" /> Add attachments
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, idx) => (
                <Badge key={`${a.filename}-${idx}`} variant="outline">
                  {a.filename}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={doSend} disabled={isSending}>
            {isSending && <Loader2 className="mr-2 size-4 animate-spin" />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MailApp;
