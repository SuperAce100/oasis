"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
};

const SAMPLE_MESSAGES: Message[] = [
  {
    id: "1",
    from: "Oasis Team",
    subject: "Welcome to Oasis OS",
    preview: "Thanks for trying our OS demo!",
    date: new Date().toLocaleDateString(),
  },
  {
    id: "2",
    from: "Calendar",
    subject: "Event reminder",
    preview: "Standup today at 10:00 AM",
    date: new Date().toLocaleDateString(),
  },
];

export type MailAppProps = React.HTMLAttributes<HTMLDivElement>;

export function MailApp({ className, ...props }: MailAppProps) {
  const [messages] = React.useState<Message[]>(SAMPLE_MESSAGES);
  const [selectedId, setSelectedId] = React.useState<string | null>(messages[0]?.id ?? null);

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  return (
    <div className={cn("w-full h-full", className)} {...props}>
      <div className="grid grid-cols-3 gap-3 h-full">
        <aside className="col-span-1 border-r pr-2 overflow-auto">
          <ul className="space-y-1">
            {messages.map((m) => (
              <li key={m.id}>
                <button
                  className={cn(
                    "w-full text-left rounded-md p-2 hover:bg-accent",
                    selectedId === m.id && "bg-accent"
                  )}
                  onClick={() => setSelectedId(m.id)}
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{m.from}</span>
                    <span className="text-xs text-muted-foreground">{m.date}</span>
                  </div>
                  <div className="text-sm">{m.subject}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{m.preview}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="col-span-2 overflow-auto">
          {selected ? (
            <div className="h-full flex flex-col">
              <header className="border-b pb-2 mb-2">
                <div className="text-sm text-muted-foreground">From: {selected.from}</div>
                <h2 className="text-lg font-semibold">{selected.subject}</h2>
              </header>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>{selected.preview}</p>
                <p>
                  This is a demo message body. Build your own Mail integration here.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full grid place-items-center text-muted-foreground">
              Select a message
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default MailApp;


