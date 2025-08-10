"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TerminalAppProps = React.HTMLAttributes<HTMLDivElement> & {
  // Accept a JSON string via data-deeplink attribute to avoid prop drilling through Window
  "data-deeplink"?: string;
};

type OutputEntry =
  | { type: "cmd"; prompt: string; text: string }
  | { type: "out"; text: string }
  | { type: "error"; text: string };

export function TerminalApp({ className, ...props }: TerminalAppProps) {
  // ---------- State ----------
  const [outputLines, setOutputLines] = React.useState<OutputEntry[]>([
    { type: "out", text: "Welcome to Oasis Terminal" },
    { type: "out", text: "Type 'help' and press Enter" },
  ]);
  const [inputValue, setInputValue] = React.useState<string>("");
  const [commandHistory, setCommandHistory] = React.useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);
  const [cwd, setCwd] = React.useState<string>("/home/oasis");

  const outputRef = React.useRef<HTMLDivElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // ---------- Effects ----------
  React.useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus();
  }, []);

  // Execute deeplink command on mount and when it changes
  const deeplinkRaw = (props as any)["data-deeplink"] as string | undefined;
  const lastDeeplinkRawRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (!deeplinkRaw || deeplinkRaw === lastDeeplinkRawRef.current) return;
    lastDeeplinkRawRef.current = deeplinkRaw;
    try {
      const parsed = JSON.parse(deeplinkRaw) as { command?: string; cwd?: string };
      if (parsed?.cwd) setCwd(parsed.cwd);
      if (parsed?.command && parsed.command.trim().length > 0) {
        void runCommand(parsed.command, { cwd: parsed.cwd });
      }
    } catch {
      // ignore malformed deeplink
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deeplinkRaw]);

  React.useEffect(() => {
    // Keep scrolled to bottom when output changes
    inputRef.current?.scrollIntoView({ block: "end" });
  }, [outputLines]);

  // ---------- Prompt / Output helpers ----------
  const promptName = "oasis";
  const promptPath = React.useMemo(() => `${cwd} $`, [cwd]);
  // Basic tokenizer for client-side helpers (used for Tab-completion parsing only)
  function tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let quote: '"' | "'" | null = null;
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (quote) {
        if (ch === quote) quote = null;
        else current += ch;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch as '"' | "'";
        continue;
      }
      if (ch === " ") {
        if (current) {
          tokens.push(current);
          current = "";
        }
        continue;
      }
      current += ch;
    }
    if (current) tokens.push(current);
    return tokens;
  }

  // Tab completion disabled in simplified mode
  function completePath(): { completed?: string; options?: string[] } {
    return {};
  }

  function printLines(lines: string[]) {
    setOutputLines((prev) => [
      ...prev,
      ...lines.map<OutputEntry>((t) => ({ type: "out", text: t })),
    ]);
  }

  function printLine(line: string) {
    setOutputLines((prev) => [...prev, { type: "out", text: line }]);
  }

  // (No local filesystem logic; all command execution handled by API)

  async function runCommand(rawInput: string, options?: { cwd?: string }) {
    const input = rawInput.trim();
    if (input.length === 0) return;
    // Print prompt (path only) + command, with colored prompt in history
    setOutputLines((prev) => [...prev, { type: "cmd", prompt: promptPath, text: input }]);
    // Update command history navigation
    setCommandHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);

    if (input === "clear") {
      setOutputLines([]);
      return;
    }

    // POST to API to get stdout and updated cwd
    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: input, cwd: options?.cwd ?? cwd }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { stdout?: string[]; cwd?: string; error?: string };
      if (data.error) {
        printLine(data.error);
        return;
      }
      if (Array.isArray(data.stdout) && data.stdout.length > 0) {
        printLines(data.stdout);
      }
      if (typeof data.cwd === "string") setCwd(data.cwd);
    } catch (e) {
      printLine("error: failed to execute command");
    }
  }

  // ---------- Render ----------
  return (
    <div
      className={cn(
        "w-full min-h-0 h-full bg-black text-white font-mono text-sm p-2 flex flex-col overflow-y-auto",
        className
      )}
      onClick={() => inputRef.current?.focus()}
      {...props}
    >
      <div ref={outputRef} className="space-y-0">
        <div className="text-cyan-400">{promptName}</div>
        {outputLines.map((entry, idx) => {
          if (entry.type === "cmd") {
            return (
              <div key={idx} className="whitespace-pre-wrap leading-5">
                <span className="text-cyan-400">{entry.prompt}</span>
                <span> {entry.text}</span>
              </div>
            );
          }
          if (entry.type === "error") {
            return (
              <div key={idx} className="whitespace-pre-wrap leading-5 text-red-400">
                {entry.text}
              </div>
            );
          }
          return (
            <div key={idx} className="whitespace-pre-wrap leading-5">
              {entry.text}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runCommand(inputValue);
          setInputValue("");
        }}
      >
        <span className="text-cyan-400 select-none">{promptPath}</span>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHistoryIndex((idx) => {
                const next = idx < 0 ? commandHistory.length - 1 : Math.max(0, idx - 1);
                const cmd = commandHistory[next] ?? "";
                setInputValue(cmd);
                return next;
              });
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setHistoryIndex((idx) => {
                if (idx < 0) return -1;
                const next = idx + 1;
                if (next >= commandHistory.length) {
                  setInputValue("");
                  return -1;
                }
                const cmd = commandHistory[next] ?? "";
                setInputValue(cmd);
                return next;
              });
            } else if (e.key === "Tab") {
              e.preventDefault();
              // naive path completion for single-arg commands expecting paths
              const trimmed = inputValue.trim();
              const args = tokenize(trimmed);
              if (args.length >= 1) {
                const [cmd, ...rest] = args;
                const commandsExpectingPath = new Set(["cd", "ls", "cat", "mkdir", "touch", "rm"]);
                if (commandsExpectingPath.has(cmd)) {
                  // Tab completion disabled in simplified server mode
                }
              }
            }
          }}
          className="flex-1 bg-transparent text-white placeholder:text-white/60 focus:outline-none"
          placeholder="Type a command..."
          aria-label="Terminal input"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}

export default TerminalApp;
