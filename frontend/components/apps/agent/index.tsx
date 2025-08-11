"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import ChatMessage from "@/components/apps/agent/chat-message";
import type { UIMessage } from "ai";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { captureViewport, executeUiAction, mapComputerCallToUiAction } from "@/lib/computer-use";

export interface AgentAppProps extends React.HTMLAttributes<HTMLDivElement> {
  query: string;
  onClose?: () => void;
}

export function AgentApp({ className, query, onClose, ...props }: AgentAppProps) {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
  });
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Seed initial query
  const seededRef = React.useRef(false);
  React.useEffect(() => {
    const trimmed = query?.trim();
    if (!seededRef.current && trimmed) {
      seededRef.current = true;
      // Fire and forget; hook will manage streaming
      void sendMessage({ text: trimmed });
    }
  }, [query, sendMessage]);

  // keep scroll at bottom

  React.useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Heuristic: scan latest assistant message for an embedded uiIntent JSON object and emit a window event
  React.useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    const text = (last as any)?.content ?? (last as any)?.text ?? "";
    if (typeof text !== "string") return;
    const lower = text.toLowerCase();
    try {
      // Find the last JSON object occurrence
      const match = text.match(/\{[\s\S]*\}$/);
      if (!match) return;
      const obj = JSON.parse(match[0]);
      const uiIntent = obj?.uiIntent || obj?.data?.uiIntent;
      if (uiIntent && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oasis-ui-intent", { detail: uiIntent }));
      }
    } catch {
      // ignore parsing issues
    }
    // Heuristic fallback: if agent mentioned open_app Terminal, dispatch UI intent
    if (typeof window !== "undefined") {
      if (lower.includes("open_app") && lower.includes("terminal")) {
        window.dispatchEvent(
          new CustomEvent("oasis-ui-intent", { detail: { action: "open_app", appId: "terminal" } })
        );
      } else if (lower.includes("open_app") && lower.includes("mail")) {
        window.dispatchEvent(
          new CustomEvent("oasis-ui-intent", { detail: { action: "open_app", appId: "mail" } })
        );
      } else if (lower.includes("open_app") && lower.includes("calendar")) {
        window.dispatchEvent(
          new CustomEvent("oasis-ui-intent", { detail: { action: "open_app", appId: "calendar" } })
        );
      } else if (lower.includes("open_app") && (lower.includes("files") || lower.includes("file"))) {
        window.dispatchEvent(
          new CustomEvent("oasis-ui-intent", { detail: { action: "open_app", appId: "files" } })
        );
      }
    }
  }, [messages]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    // Special command: /use <goal> enables frontend-only computer use
    if (trimmed.startsWith("/use ")) {
      const goal = trimmed.slice(5).trim();
      void (async () => {
        // Loop using backend do_anything with frontend screenshots
        for (let i = 0; i < 6; i++) {
          const shot = await captureViewport();
          const res = await fetch("/api/mcp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "call",
              name: "do_anything",
              arguments: { goal, maxSteps: 1, allowExecution: false, screenshot: shot.dataUrl },
            }),
          });
          const out = (await res.json().catch(() => ({}))) as any;
          const first = Array.isArray(out?.content) ? out.content[0] : null;
          const data = first?.data ?? {};
          const last = Array.isArray(data?.transcript) ? data.transcript[data.transcript.length - 1] : null;
          const uiIntent = last?.uiIntent;
          if (uiIntent?.args) {
            await executeUiAction(uiIntent.args);
          }
          if (data?.done) break;
          await new Promise((r) => setTimeout(r, 250));
        }
      })();
    } else {
      void sendMessage({ text: trimmed });
    }
    setInput("");
  }

  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          "flex h-full w-full flex-col rounded-2xl p-3 text-sm shadow-xl backdrop-blur-lg bg-gradient-to-b from-white/90 to-white/70",
          "z-[9999]"
        )}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-0">
            <div className="font-semibold ml-1 text-2xl text-stone-800">Oasis Agent</div>
            {status === "submitted" || status === "streaming" ? (
              <span className="inline-flex items-center gap-1 text-xs text-primary ml-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Running
              </span>
            ) : (
              <span className="text-xs text-muted-foreground ml-1">Idle</span>
            )}
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="iconSm"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            <XIcon className="" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {messages.map((m: UIMessage) => (
            <ChatMessage key={m.id} message={m} />
          ))}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={onSubmit} className="mt-2 flex items-center gap-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                stop();
                onClose?.();
              }
            }}
            placeholder="Send a message…"
            className={cn(
              "flex-1 rounded-lg border-foreground/10 px-2 py-1 bg-white/80 hover:bg-foreground/10 rounded-r-sm"
            )}
          />
          <Button
            type="submit"
            variant="default"
            size="iconLg"
            className="rounded-lg rounded-l-sm text-sm shadow-md shadow-foreground/10 hover:-translate-y-0.5 transition-all duration-200 ease-out focus-visible:-translate-y-0.5"
            disabled={status !== "ready"}
          >
            <SendIcon />
          </Button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}

export default AgentApp;
