"use client";

import * as React from "react";
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
import { Loader2, Paperclip, Plus } from "lucide-react";
import { toast } from "sonner";
import { postJSON } from "./utils";

export function ComposeDialog({ onSent }: { onSent: () => void | Promise<void> }) {
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
        <Button size="default" className="">
          <Plus className="size-4" />
          Compose
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl z-[900]">
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
