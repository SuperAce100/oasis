"use client";

import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import Markdown from "@/components/ui/markdown";
import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link as LinkIcon, FileText, BrainIcon } from "lucide-react";
import type { UIMessage } from "ai";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const userMessageVariants = cva(
  "flex flex-col gap-2 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-10",
  {
    variants: {
      variant: {
        message:
          "bg-gradient-to-b from-primary to-primary/70 border border-primary text-primary-foreground shadow-lg shadow-foreground/5 w-fit max-w-2xs ml-auto rounded-xl px-4 py-2 font-medium",
        title: "font-semibold tracking-tight text-3xl mt-4 border-b-2 border-primary/30 pb-2",
      },
    },
  }
);
const assistantMessageVariants = cva("flex flex-col gap-2", {
  variants: {
    variant: {
      message: "bg-muted rounded-xl px-6 py-4 border border-foreground/5 shadow-lg mr-8",
      paragraph: "",
    },
  },
});

export default function ChatMessage({
  message,
  className,
}: {
  message: UIMessage;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    const text = getTextForCopy(message);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // User bubble (legacy or UIMessage with role user)
  if (message.role === "user") {
    return (
      <div className={cn(userMessageVariants({ variant: "message" }), className)}>
        {renderMessageContent(message)}
      </div>
    );
  }

  // Assistant/system bubble
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div
        className={cn(
          "relative flex flex-col gap-2",
          assistantMessageVariants({ variant: "paragraph" })
        )}
      >
        {renderMessageContent(message)}
        <Button
          onClick={copyToClipboard}
          variant="ghost"
          size="iconSm"
          className="bg-transparent -my-2 text-muted-foreground hover:bg-foreground/10 focus-visible:ring-0 active:bg-foreground/10"
          aria-label={copied ? "Copied" : "Copy to clipboard"}
        >
          <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
          <Copy
            className={cn("size-3 transition-all duration-300", copied ? "scale-0" : "scale-100")}
          />
          <Check
            className={cn(
              "absolute inset-0 m-auto size-3 text-emerald-500 transition-all duration-300",
              copied ? "scale-100" : "scale-0"
            )}
          />
        </Button>
      </div>
    </div>
  );
}

function renderMessageContent(message: UIMessage) {
  // Combine all reasoning parts into one collapsible block
  const reasoningTexts: string[] = [];
  for (const p of message.parts as unknown[]) {
    if (isReasoningUIPart(p)) {
      const t = p.text ?? "";
      if (t.length > 0) reasoningTexts.push(t);
    }
  }
  const combinedReasoning = reasoningTexts.join("\n\n");

  let renderedReasoning = false;

  return (
    <div className="flex flex-col gap-2">
      {message.parts.map((part, idx) => {
        if (isTextUIPart(part)) {
          return <Markdown key={idx}>{part.text ?? ""}</Markdown>;
        }
        if (isReasoningUIPart(part)) {
          if (renderedReasoning || combinedReasoning.length === 0) return null;
          renderedReasoning = true;
          return (
            <Accordion
              key={`reasoning-${idx}`}
              className="-my-1 text-sm opacity-70"
              type="single"
              collapsible
              defaultValue="reasoning"
            >
              <AccordionItem value="reasoning">
                <AccordionTrigger className="py-2">
                  <div className="flex items-center gap-2">
                    <BrainIcon className="size-4" /> Thought process
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Markdown className="text-sm opacity-90">{combinedReasoning}</Markdown>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }
        if (isSourceUrlUIPart(part)) {
          return (
            <a
              key={idx}
              href={part.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate rounded-md border bg-white/60 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
            >
              <LinkIcon className="size-3" /> {part.title ?? part.url}
            </a>
          );
        }
        if (isSourceDocumentUIPart(part)) {
          return (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-md border bg-white/60 px-2 py-1 text-xs"
            >
              <FileText className="size-3" />
              <span className="font-medium">{part.title}</span>
              {part.filename && <span className="text-stone-500">({part.filename})</span>}
              {part.mediaType && <span className="ml-auto text-stone-400">{part.mediaType}</span>}
            </div>
          );
        }
        if (isFileUIPart(part)) {
          return (
            <a
              key={idx}
              href={part.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 truncate rounded-md border bg-white/60 px-2 py-1 text-xs hover:bg-muted"
            >
              <FileText className="size-3" /> {part.filename ?? part.url}
              {part.mediaType && <span className="text-stone-400">{part.mediaType}</span>}
            </a>
          );
        }
        if (isToolUIPart(part)) {
          return (
            <div
              key={idx}
              className="inline-flex w-fit items-center gap-2 rounded-md border bg-white/60 px-2 py-1 text-xs"
            >
              <span className="rounded-sm bg-stone-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Tool
              </span>
              {part.state && <span className="text-stone-600">{String(part.state)}</span>}
            </div>
          );
        }
        if (isStepStartUIPart(part)) {
          return null;
        }
        return (
          <pre key={idx} className="rounded-md bg-stone-50 px-2 py-1 text-[10px] text-stone-700">
            {JSON.stringify(part, null, 2)}
          </pre>
        );
      })}
    </div>
  );
}

function getTextForCopy(message: UIMessage): string {
  const texts: string[] = [];
  for (const p of message.parts) {
    if (isTextUIPart(p) || isReasoningUIPart(p)) {
      const t = p.text;
      if (t) texts.push(t);
    }
  }
  return texts.join("\n\n");
}

function getAvatarFromMetadata(message: UIMessage): string | null {
  const meta = message.metadata as unknown;
  if (typeof meta === "object" && meta && "avatar" in meta) {
    const avatar = (meta as Record<string, unknown>).avatar;
    if (typeof avatar === "string" && avatar.length > 0) return avatar;
  }
  return null;
}

// ---------- Type guards for UIMessage parts ----------
type StepStartUIPart = { type: "step-start"; text?: string; state?: "streaming" | "done" };
type TextUIPart = { type: "text"; text?: string; state?: "streaming" | "done" };
type ReasoningUIPart = {
  type: "reasoning";
  text?: string;
  state?: "streaming" | "done";
  providerMetadata?: Record<string, unknown>;
};
type SourceUrlUIPart = { type: "source-url"; url: string; title?: string };
type SourceDocumentUIPart = {
  type: "source-document";
  title: string;
  filename?: string;
  mediaType: string;
};
type FileUIPart = { type: "file"; url: string; filename?: string; mediaType: string };
type ToolUIPart = { type: string; state?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStepStartUIPart(p: unknown): p is StepStartUIPart {
  return isRecord(p) && p.type === "step-start";
}

function isTextUIPart(p: unknown): p is TextUIPart {
  return isRecord(p) && p.type === "text";
}
function isReasoningUIPart(p: unknown): p is ReasoningUIPart {
  return isRecord(p) && p.type === "reasoning";
}
function isSourceUrlUIPart(p: unknown): p is SourceUrlUIPart {
  return isRecord(p) && p.type === "source-url" && typeof p.url === "string";
}
function isSourceDocumentUIPart(p: unknown): p is SourceDocumentUIPart {
  return (
    isRecord(p) &&
    p.type === "source-document" &&
    typeof p.title === "string" &&
    typeof p.mediaType === "string"
  );
}
function isFileUIPart(p: unknown): p is FileUIPart {
  return isRecord(p) && p.type === "file" && typeof p.url === "string";
}
function isToolUIPart(p: unknown): p is ToolUIPart {
  return isRecord(p) && typeof p.type === "string" && p.type.startsWith("tool-");
}
