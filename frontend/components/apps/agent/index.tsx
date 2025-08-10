"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AgentAppProps extends React.HTMLAttributes<HTMLDivElement> {
  query: string;
  onClose?: () => void;
}

type AgentMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
};

export function AgentApp({ className, query, onClose, ...props }: AgentAppProps) {
  const [messages, setMessages] = React.useState<AgentMessage[]>(() => [
    { id: crypto.randomUUID(), role: "user", content: query },
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
            role: "agent",
            content:
              "I am processing your request. This is a demo agent. You can continue using the OS while I run.",
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
    const userMsg: AgentMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsRunning(true);
  }

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-xl bg-white/80 p-3 text-sm text-stone-900 shadow-xl backdrop-blur",
        "border border-white/50 z-[9999]",
        className
      )}
      {...props}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-medium text-stone-800">Agent</div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" /> Running
            </span>
          ) : (
            <span className="text-xs text-stone-500">Idle</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-md bg-white/60 p-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "mb-2 max-w-[85%] rounded-md px-2 py-1",
              m.role === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "mr-auto bg-stone-100 text-stone-900"
            )}
          >
            {m.content}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="mt-2 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a message…"
          className={cn(
            "flex-1 rounded-md border border-stone-300 bg-white/80 px-2 py-1",
            "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          )}
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default AgentApp;
