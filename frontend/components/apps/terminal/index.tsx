"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TerminalAppProps = React.HTMLAttributes<HTMLDivElement>;

export function TerminalApp({ className, ...props }: TerminalAppProps) {
  // ---------- Types ----------
  type FileNode = { type: "file"; content: string };
  type DirNode = { type: "dir"; children: Map<string, NodeEntry> };
  type NodeEntry = FileNode | DirNode;

  // ---------- State ----------
  const [outputLines, setOutputLines] = React.useState<string[]>([
    "Welcome to Oasis Terminal",
    "Type 'help' and press Enter",
  ]);
  const [inputValue, setInputValue] = React.useState<string>("");
  const [commandHistory, setCommandHistory] = React.useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);
  const [fileSystem, setFileSystem] = React.useState<DirNode>(() => createInitialFileSystem());
  const [cwdParts, setCwdParts] = React.useState<string[]>(["home", "oasis"]);

  const outputRef = React.useRef<HTMLDivElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // ---------- Effects ----------
  React.useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    // Keep scrolled to bottom when output changes
    inputRef.current?.scrollIntoView({ block: "end" });
  }, [outputLines]);

  // ---------- FS Helpers ----------
  function createInitialFileSystem(): DirNode {
    const root: DirNode = { type: "dir", children: new Map() };
    const home: DirNode = { type: "dir", children: new Map() };
    const oasis: DirNode = { type: "dir", children: new Map() };
    const documents: DirNode = { type: "dir", children: new Map() };
    const readme: FileNode = {
      type: "file",
      content: "Welcome to Oasis OS! This is a demo file.\n",
    };
    documents.children.set("readme.txt", readme);
    oasis.children.set("documents", documents);
    oasis.children.set("notes.txt", { type: "file", content: "Some quick notes\n" });
    home.children.set("oasis", oasis);
    root.children.set("home", home);
    root.children.set("tmp", { type: "dir", children: new Map() });
    return root;
  }

  function isDir(node: NodeEntry | undefined): node is DirNode {
    return Boolean(node) && (node as NodeEntry).type === "dir";
  }
  function isFile(node: NodeEntry | undefined): node is FileNode {
    return Boolean(node) && (node as NodeEntry).type === "file";
  }

  function normalizeAndSplitPath(input: string): { parts: string[]; isAbsolute: boolean } {
    const isAbsolute = input.startsWith("/");
    const rawParts = input.split("/").filter((p) => p.length > 0);
    const parts: string[] = [];
    for (const p of rawParts) {
      if (p === ".") continue;
      if (p === "..") {
        if (parts.length > 0) parts.pop();
        continue;
      }
      parts.push(p);
    }
    return { parts, isAbsolute };
  }

  function resolvePath(cwd: string[], pathLike: string): string[] {
    const { parts, isAbsolute } = normalizeAndSplitPath(pathLike);
    const base = isAbsolute ? [] : [...cwd];
    for (const part of parts) {
      if (part === "..") base.pop();
      else if (part !== ".") base.push(part);
    }
    return base;
  }

  function getNode(root: DirNode, pathParts: string[]): NodeEntry | undefined {
    let current: NodeEntry = root;
    for (const segment of pathParts) {
      if (!isDir(current)) return undefined;
      const child = current.children.get(segment);
      if (!child) return undefined;
      current = child;
    }
    return current;
  }

  function ensureDir(
    root: DirNode,
    pathParts: string[],
    makeParents: boolean
  ): { ok: boolean; reason?: string } {
    let current: DirNode = root;
    for (const segment of pathParts) {
      const next = current.children.get(segment);
      if (!next) {
        if (!makeParents) return { ok: false, reason: `No such directory: ${segment}` };
        const newDir: DirNode = { type: "dir", children: new Map() };
        current.children.set(segment, newDir);
        current = newDir;
      } else if (isDir(next)) {
        current = next;
      } else {
        return { ok: false, reason: `${segment}: Not a directory` };
      }
    }
    return { ok: true };
  }

  function getParentAndName(
    root: DirNode,
    pathParts: string[]
  ): { parent?: DirNode; name: string } {
    if (pathParts.length === 0) return { parent: undefined, name: "" };
    const name = pathParts[pathParts.length - 1];
    const parentPath = pathParts.slice(0, -1);
    const parentNode =
      parentPath.length === 0 ? root : (getNode(root, parentPath) as NodeEntry | undefined);
    return { parent: isDir(parentNode) ? parentNode : undefined, name };
  }

  function formatPath(parts: string[]): string {
    const pathStr = "/" + parts.join("/");
    // Collapse /home/oasis to ~
    if (parts.length >= 2 && parts[0] === "home" && parts[1] === "oasis") {
      const remainder = parts.slice(2);
      return "~" + (remainder.length ? "/" + remainder.join("/") : "");
    }
    return pathStr;
  }

  // ---------- Input / Output helpers ----------
  const promptText = React.useMemo(() => `oasis@os:${formatPath(cwdParts)}$`, [cwdParts]);

  function printLines(lines: string[]) {
    setOutputLines((prev) => [...prev, ...lines]);
  }

  function printLine(line: string) {
    setOutputLines((prev) => [...prev, line]);
  }

  // Quote-aware tokenizer: splits by spaces, keeping quoted substrings
  function tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let quote: '"' | "'" | null = null;
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (quote) {
        if (ch === quote) {
          quote = null;
        } else {
          current += ch;
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch as '"' | "'";
        continue;
      }
      if (ch === " ") {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }
        continue;
      }
      current += ch;
    }
    if (current.length > 0) tokens.push(current);
    return tokens;
  }

  function splitPathForCompletion(partial: string): { dirParts: string[]; prefix: string } {
    if (partial.endsWith("/")) {
      // path points to a directory; complete inside it
      const dirParts = resolvePath(cwdParts, partial);
      return { dirParts, prefix: "" };
    }
    const idx = partial.lastIndexOf("/");
    if (idx === -1) {
      return { dirParts: [...cwdParts], prefix: partial };
    }
    const base = partial.slice(0, idx + 1); // keep trailing /
    const dirParts = resolvePath(cwdParts, base);
    const prefix = partial.slice(idx + 1);
    return { dirParts, prefix };
  }

  function completePath(partial: string): { completed?: string; options?: string[] } {
    const { dirParts, prefix } = splitPathForCompletion(partial);
    const dirNode = getNode(fileSystem, dirParts);
    if (!dirNode || !isDir(dirNode)) return {};
    const candidates = Array.from(dirNode.children.keys()).filter((n) => n.startsWith(prefix));
    if (candidates.length === 1) {
      const name = candidates[0];
      const child = dirNode.children.get(name);
      const suffix = isDir(child) ? "/" : "";
      const base = partial.endsWith("/")
        ? partial
        : partial.slice(0, partial.lastIndexOf("/") + 1) || "";
      const completed = (base || "") + name + suffix;
      return { completed };
    }
    if (candidates.length > 1) {
      return { options: candidates };
    }
    return {};
  }

  // ---------- Commands ----------
  function command_help(): string[] {
    return [
      "Available commands:",
      "  help                 Show this help",
      "  clear                Clear the terminal",
      "  pwd                  Print working directory",
      "  ls [path]            List directory contents",
      "  cd <path>            Change directory",
      "  cat <file>           Print file contents",
      "  mkdir <dir>          Create directory",
      "  touch <file>         Create empty file",
      "  rm [-r] <path>       Remove file or directory",
      "  echo <text>          Print text. Use 'echo text > file' to write",
      "  history              Show command history",
      "  date                 Show current date",
      "  whoami               Show current user",
    ];
  }

  function command_pwd(): string[] {
    return [formatPath(cwdParts)];
  }

  function command_ls(args: string[]): string[] {
    const targetPath = args[0] ? resolvePath(cwdParts, args[0]) : [...cwdParts];
    const node = getNode(fileSystem, targetPath);
    if (!node) return ["ls: No such file or directory"];
    if (isFile(node)) return [args[0] ?? formatPath(targetPath)];
    const names = Array.from(node.children.keys()).sort((a, b) => a.localeCompare(b));
    const formatted = names.map((name) => {
      const child = node.children.get(name);
      return isDir(child) ? name + "/" : name;
    });
    return [formatted.join("  ")];
  }

  function command_cd(args: string[]): string[] {
    const next = args[0] ? resolvePath(cwdParts, args[0]) : ["home", "oasis"];
    const node = getNode(fileSystem, next);
    if (!node) return ["cd: No such file or directory"];
    if (!isDir(node)) return ["cd: Not a directory"];
    setCwdParts(next);
    return [];
  }

  function command_cat(args: string[]): string[] {
    if (args.length === 0) return ["cat: missing file operand"];
    const pathParts = resolvePath(cwdParts, args[0]);
    const node = getNode(fileSystem, pathParts);
    if (!node) return ["cat: No such file"];
    if (!isFile(node)) return ["cat: Is a directory"];
    return [node.content];
  }

  function command_mkdir(args: string[]): string[] {
    if (args.length === 0) return ["mkdir: missing operand"];
    const target = resolvePath(cwdParts, args[0]);
    const { parent, name } = getParentAndName(fileSystem, target);
    if (!parent) return ["mkdir: cannot create directory"];
    if (parent.children.has(name)) return ["mkdir: File exists"];
    parent.children.set(name, { type: "dir", children: new Map() });
    // trigger state update
    setFileSystem(structuredCloneDir(fileSystem));
    return [];
  }

  function command_touch(args: string[]): string[] {
    if (args.length === 0) return ["touch: missing file operand"];
    const target = resolvePath(cwdParts, args[0]);
    const { parent, name } = getParentAndName(fileSystem, target);
    if (!parent) return ["touch: cannot touch file"];
    const existing = parent.children.get(name);
    if (existing && !isFile(existing)) return ["touch: is a directory"];
    parent.children.set(name, {
      type: "file",
      content: existing && isFile(existing) ? existing.content : "",
    });
    setFileSystem(structuredCloneDir(fileSystem));
    return [];
  }

  function command_rm(args: string[]): string[] {
    if (args.length === 0) return ["rm: missing operand"];
    const recursive = args[0] === "-r" || args[0] === "-rf" || args[0] === "-fr";
    const pathArg = recursive ? args[1] : args[0];
    if (!pathArg) return ["rm: missing operand"];
    const target = resolvePath(cwdParts, pathArg);
    const { parent, name } = getParentAndName(fileSystem, target);
    if (!parent) return ["rm: cannot remove"];
    const node = parent.children.get(name);
    if (!node) return ["rm: No such file or directory"];
    if (isDir(node) && !recursive && node.children.size > 0) return ["rm: is a directory (use -r)"];
    parent.children.delete(name);
    setFileSystem(structuredCloneDir(fileSystem));
    return [];
  }

  function command_echo(args: string[]): string[] {
    if (args.length === 0) return [""];
    const redirectIndex = args.indexOf(">");
    if (redirectIndex > -1) {
      const text = args.slice(0, redirectIndex).join(" ");
      const targetPath = args[redirectIndex + 1];
      if (!targetPath) return ["echo: missing file after >"];
      const target = resolvePath(cwdParts, targetPath);
      const { parent, name } = getParentAndName(fileSystem, target);
      if (!parent) return ["echo: cannot write file"];
      parent.children.set(name, { type: "file", content: text + "\n" });
      setFileSystem(structuredCloneDir(fileSystem));
      return [];
    }
    return [args.join(" ")];
  }

  function command_history(): string[] {
    return commandHistory.map((cmd, i) => `${i + 1}  ${cmd}`);
  }

  function command_date(): string[] {
    return [new Date().toString()];
  }

  function command_whoami(): string[] {
    return ["oasis"];
  }

  function structuredCloneDir(dir: DirNode): DirNode {
    // Lightweight deep clone for our simple FS structure
    const cloneChildren = new Map<string, NodeEntry>();
    for (const [k, v] of dir.children) {
      if (isDir(v)) cloneChildren.set(k, structuredCloneDir(v));
      else cloneChildren.set(k, { type: "file", content: v.content });
    }
    return { type: "dir", children: cloneChildren };
  }

  function runCommand(rawInput: string) {
    const input = rawInput.trim();
    if (input.length === 0) return;
    // Print prompt + command
    printLine(`${promptText} ${input}`);
    // Update command history navigation
    setCommandHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);

    const args = tokenize(input);
    const [cmd, ...rest] = args;
    let lines: string[] = [];
    switch (cmd) {
      case "help":
        lines = command_help();
        break;
      case "clear":
        setOutputLines([]);
        return;
      case "pwd":
        lines = command_pwd();
        break;
      case "ls":
        lines = command_ls(rest);
        break;
      case "cd":
        lines = command_cd(rest);
        break;
      case "cat":
        lines = command_cat(rest);
        break;
      case "mkdir":
        lines = command_mkdir(rest);
        break;
      case "touch":
        lines = command_touch(rest);
        break;
      case "rm":
        lines = command_rm(rest);
        break;
      case "echo":
        lines = command_echo(rest);
        break;
      case "history":
        lines = command_history();
        break;
      case "date":
        lines = command_date();
        break;
      case "whoami":
        lines = command_whoami();
        break;
      default:
        lines = [`${cmd}: command not found`];
    }
    if (lines.length > 0) printLines(lines);
  }

  // ---------- Render ----------
  return (
    <div
      className={cn(
        "w-full min-h-0 h-full bg-black text-green-300 font-mono text-sm p-2 flex flex-col overflow-y-auto",
        className
      )}
      onClick={() => inputRef.current?.focus()}
      {...props}
    >
      <div ref={outputRef} className="space-y-0">
        {outputLines.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap leading-5">
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        className="pt-1 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runCommand(inputValue);
          setInputValue("");
        }}
      >
        <span className="text-green-500 select-none">{promptText}</span>
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
                  const partial = rest[0] ?? "";
                  const { completed, options } = completePath(partial);
                  if (completed) {
                    const next = [cmd, completed, ...rest.slice(1)].join(" ");
                    setInputValue(next + (completed.endsWith("/") ? "" : ""));
                  } else if (options && options.length > 0) {
                    printLines([options.join("  ")]);
                  }
                }
              }
            }
          }}
          className="flex-1 bg-transparent text-green-300 placeholder:text-green-700/60 focus:outline-none"
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
