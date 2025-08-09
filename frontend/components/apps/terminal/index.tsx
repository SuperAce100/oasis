"use client";

import * as React from "react";

export type TerminalAppProps = React.HTMLAttributes<HTMLDivElement>;

export function TerminalApp({ className, ...props }: TerminalAppProps) {
  const [history, setHistory] = React.useState<string[]>([
    "Welcome to Oasis Terminal",
    "Type 'help' and press Enter",
  ]);
  const [inputValue, setInputValue] = React.useState("");

  function handleCommand(raw: string) {
    const command = raw.trim();
    if (command.length === 0) return;

    const nextHistory: string[] = [];
    nextHistory.push(`$ ${command}`);

    if (command === "help") {
      nextHistory.push("Available commands: help, clear, echo <text>");
    } else if (command === "clear") {
      setHistory([]);
      return;
    } else if (command.startsWith("echo ")) {
      nextHistory.push(command.slice(5));
    } else {
      nextHistory.push(`Command not found: ${command}`);
    }

    setHistory((prev) => [...prev, ...nextHistory]);
  }

  return (
    <div
      className={
        "w-full h-full bg-black text-green-300 font-mono text-sm rounded-md p-3 outline outline-1 outline-black/20 " +
        (className ?? "")
      }
      {...props}
    >
      <div className="space-y-1 overflow-auto max-h-full pr-1">
        {history.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap leading-5">
            {line}
          </div>
        ))}
      </div>
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleCommand(inputValue);
          setInputValue("");
        }}
      >
        <span className="text-green-500">$</span>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 bg-transparent text-green-300 placeholder:text-green-700/60 focus:outline-none"
          placeholder="Type a command..."
          aria-label="Terminal input"
        />
      </form>
    </div>
  );
}

export default TerminalApp;


