// Terminal proxy API -> delegates to backend MCP server terminal.execute@v1
// Accepts JSON: { command: string, cwd?: string }
// Returns JSON: { stdout: string[], cwd: string } or { error: string }

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id: number;
  result: unknown;
};

type JsonRpcError = {
  jsonrpc: "2.0";
  id: number | null;
  error: { code?: number; message: string; data?: unknown };
};

type Pending = {
  resolve: (value: JsonRpcSuccess) => void;
  reject: (reason: Error) => void;
};

class MCPClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private initialized = false;
  private readonly pending = new Map<number, Pending>();
  private readonly stdoutBuffer: string[] = [];

  private getBackendDir(): string {
    // Resolve backend directory relative to frontend
    const candidate = path.resolve(process.cwd(), "..", "backend");
    return candidate;
  }

  private ensureStarted(): Promise<void> {
    if (this.process && this.initialized) return Promise.resolve();

    return new Promise((resolve, reject) => {
      try {
        const backendDir = this.getBackendDir();
        const distEntry = path.join(backendDir, "dist", "index.js");

        let proc: ChildProcessWithoutNullStreams;
        if (fs.existsSync(distEntry)) {
          proc = spawn("node", [distEntry], { cwd: backendDir, stdio: ["pipe", "pipe", "pipe"] });
        } else {
          // Fallback to dev mode
          proc = spawn("pnpm", ["run", "dev"], {
            cwd: backendDir,
            stdio: ["pipe", "pipe", "pipe"],
          });
        }

        this.process = proc;

        proc.stdout.setEncoding("utf8");
        proc.stdout.on("data", (chunk: string) => {
          const parts = (this.stdoutBuffer.pop() ?? "") + chunk;
          const lines = parts.split("\n");
          // keep last partial line in buffer
          this.stdoutBuffer.push(lines.pop() ?? "");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("{")) continue; // ignore non-JSON logs
            try {
              const msg = JSON.parse(trimmed) as JsonRpcSuccess | JsonRpcError;
              if ("id" in msg && msg.id != null) {
                const pending = this.pending.get(msg.id as number);
                if (pending) {
                  if ((msg as JsonRpcError).error) {
                    const err = (msg as JsonRpcError).error;
                    pending.reject(new Error(err.message));
                  } else {
                    pending.resolve(msg as JsonRpcSuccess);
                  }
                  this.pending.delete(msg.id as number);
                }
              }
            } catch {
              // ignore
            }
          }
        });

        proc.stderr.setEncoding("utf8");
        proc.stderr.on("data", () => {
          // Intentionally ignore backend stderr logs to avoid polluting API output
        });

        proc.on("error", (err) => {
          reject(
            new Error(`Backend process error: ${err instanceof Error ? err.message : String(err)}`)
          );
        });

        // Send initialize
        const initId = this.nextId++;
        this.send({
          jsonrpc: "2.0",
          id: initId,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "oasis-frontend", version: "1.0.0" },
          },
        });

        this.pending.set(initId, {
          resolve: () => {
            this.initialized = true;
            resolve();
          },
          reject: (e) => reject(e),
        });
      } catch (e) {
        reject(e as Error);
      }
    });
  }

  private send(payload: JsonRpcRequest) {
    if (!this.process) throw new Error("Backend process not started");
    this.process.stdin.write(JSON.stringify(payload) + "\n");
  }

  async callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
    await this.ensureStarted();

    const id = this.nextId++;
    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    };

    const response = await new Promise<JsonRpcSuccess>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send(req);
    });

    return response.result as T;
  }
}

// Singleton MCP client across route invocations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalStore = globalThis as any;
const MCP_KEY = "__OASIS_MCP_CLIENT__" as const;
const mcpClient: MCPClient = globalStore[MCP_KEY] ?? new MCPClient();
globalStore[MCP_KEY] = mcpClient;

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

function splitLines(text: string | undefined): string[] {
  if (!text) return [];
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

async function ensureSandboxBase(root: string) {
  await fs.promises.mkdir(root, { recursive: true });
  await fs.promises.mkdir(path.join(root, "home", "oasis"), { recursive: true });
  await fs.promises.mkdir(path.join(root, "tmp"), { recursive: true });
}

export async function POST(req: Request) {
  try {
    const { command, cwd } = (await req.json()) as { command?: string; cwd?: string };
    if (!command || typeof command !== "string") {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    // Virtualize CWD by stripping leading '/'
    // Example: '/home/oasis' -> 'home/oasis'
    const virtualCwd = typeof cwd === "string" ? cwd.replace(/^\/+/, "") : "";

    // Define a sandbox rooted inside backend directory
    const backendDir = path.resolve(process.cwd(), "..", "backend");
    const sandboxRoot = path.join(backendDir, "sandbox");
    await ensureSandboxBase(sandboxRoot);

    // Handle `cd` locally to maintain a session-like CWD
    const args = tokenize(command.trim());
    if (args[0] === "cd") {
      // Prevent absolute OS paths by removing leading '/'
      const rawTarget = args[1] ?? "";
      const target = rawTarget.replace(/^\/+/, "");
      const nextVirtual = path.posix.normalize(
        target ? path.posix.join(virtualCwd || "", target) : virtualCwd || ""
      );

      // Validate using sandbox filesystem
      const absPath = path.resolve(sandboxRoot, nextVirtual);
      try {
        const stat = await fs.promises.stat(absPath);
        if (!stat.isDirectory()) {
          return Response.json({ stdout: ["cd: Not a directory"], cwd: virtualCwd });
        }
        return Response.json({ stdout: [], cwd: nextVirtual });
      } catch {
        return Response.json({ stdout: ["cd: No such file or directory"], cwd: virtualCwd });
      }
    }

    // Delegate to backend terminal tool
    try {
      const result = await mcpClient.callTool<{
        content: Array<{ type: string; data?: { stdout?: string; stderr?: string; exitCode?: number } | undefined; text?: string }>;
      }>("terminal.execute@v1", {
        command,
        // Map virtual cwd to sandbox filesystem
        cwd: path.resolve(sandboxRoot, virtualCwd || "."),
      });

      const first = Array.isArray(result?.content) ? result.content[0] : undefined;
      const data = first?.data as
        | { stdout?: string; stderr?: string; exitCode?: number }
        | undefined;

      const outLines = [...splitLines(data?.stdout), ...splitLines(data?.stderr)].filter(
        (l) => l.length > 0
      );

      const displayCwd = "/" + (virtualCwd || "");
      return Response.json({ stdout: outLines, cwd: displayCwd === "/" ? "/" : displayCwd });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Command failed";
      return Response.json({ error: message }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
