"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import ChatMessage from "@/components/apps/agent/chat-message";
import type { UIMessage } from "ai";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export interface AgentAppProps extends React.HTMLAttributes<HTMLDivElement> {
  query: string;
  onClose?: () => void;
}

export function AgentApp({ className, query, onClose, ...props }: AgentAppProps) {
  const [messages, setMessages] = React.useState<UIMessage[]>(() => [
    {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: query }],
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isRunning, setIsRunning] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    // Simulate agent producing output for demo purposes.
    let cancelled = false;
    if (isRunning) {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            parts: [
              {
                type: "text",
                text: "I am processing your request. This is a demo agent. You can continue using the OS while I run.",
              },
            ],
          },
        ]);
        setIsRunning(false);
      }, 900);
      return () => window.clearTimeout(id);
    }
    return () => {
      cancelled = true;
    };
  }, [isRunning]);

  React.useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: trimmed }],
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsRunning(true);
  }

  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          "flex h-full w-full flex-col rounded-2xl p-3 text-sm shadow-xl backdrop-blur-lg bg-white/70",
          "z-[9999]"
        )}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-0">
            <div className="font-semibold ml-1 text-2xl text-stone-800">Oasis Agent</div>
            {isRunning ? (
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
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={handleSend} className="mt-2 flex items-center gap-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message…"
            className={cn(
              "flex-1 rounded-lg border-foreground/10 px-2 py-1 bg-white/30 hover:bg-foreground/10 rounded-r-sm"
            )}
          />
          <Button
            type="submit"
            variant="default"
            size="iconLg"
            className="rounded-lg rounded-l-sm text-sm"
          >
            <SendIcon />
          </Button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}

export default AgentApp;
