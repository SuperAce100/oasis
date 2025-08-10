// Generic MCP proxy API
// Accepts JSON: { action: 'list' } or { action: 'call', name: string, arguments?: object }
// Returns JSON with backend MCP results

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

const MCP_CLIENT_VERSION = 2 as const;

class MCPClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private initialized = false;
  private readonly pending = new Map<number, Pending>();
  private readonly stdoutRemainder: { value: string } = { value: "" };
  private startedAtMs: number | null = null;

  private getBackendDir(): string {
    return path.resolve(process.cwd(), "..", "backend");
  }

  private ensureStarted(): Promise<void> {
    // One-time version bump-based restart to pick up backend code changes
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalStore = globalThis as any;
      const KEY = "__OASIS_MCP_CLIENT_VERSION__" as const;
      const currentVersion = globalStore[KEY];
      if (currentVersion !== MCP_CLIENT_VERSION && this.process) {
        try {
          this.process.kill();
        } catch {}
        this.process = null;
        this.initialized = false;
      }
      globalStore[KEY] = MCP_CLIENT_VERSION;
    } catch {}

    // If an old process is running with the legacy dist entry, restart with dev mode
    if (this.process) {
      const spawnArgs = Array.isArray((this.process as any).spawnargs)
        ? ((this.process as any).spawnargs as string[])
        : [];
      const argsJoined = spawnArgs.join(" ");
      const isLegacyDist =
        argsJoined.includes("dist/index.js") && !argsJoined.includes("pnpm run dev");
      const isExited = (this.process as any).exitCode !== null || (this.process as any).killed;
      if (isLegacyDist || isExited) {
        try {
          this.process.kill();
        } catch {}
        this.process = null;
        this.initialized = false;
      }
    }
    if (this.process && this.initialized) return Promise.resolve();

    return new Promise((resolve, reject) => {
      try {
        const backendDir = this.getBackendDir();
        // Prefer tsx directly to ensure we run source with sandbox logic
        let proc: ChildProcessWithoutNullStreams;
        const tsxBin = path.join(
          backendDir,
          "node_modules",
          ".bin",
          process.platform === "win32" ? "tsx.cmd" : "tsx"
        );
        if (fs.existsSync(tsxBin)) {
          proc = spawn(tsxBin, ["src/index.ts"], {
            cwd: backendDir,
            stdio: ["pipe", "pipe", "pipe"],
          });
        } else {
          // Fallback to npm script which should also invoke tsx
          proc = spawn("pnpm", ["run", "dev"], {
            cwd: backendDir,
            stdio: ["pipe", "pipe", "pipe"],
          });
        }

        this.process = proc;
        this.startedAtMs = Date.now();

        proc.stdout.setEncoding("utf8");
        proc.stdout.on("data", (chunk: string) => {
          const combined = this.stdoutRemainder.value + chunk;
          const lines = combined.split("\n");
          this.stdoutRemainder.value = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("{")) continue;
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
              // ignore parse errors
            }
          }
        });

        proc.stderr.setEncoding("utf8");
        proc.stderr.on("data", () => {
          // ignore diagnostics
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

  async listTools(): Promise<unknown> {
    await this.ensureStarted();
    const id = this.nextId++;
    const req: JsonRpcRequest = { jsonrpc: "2.0", id, method: "tools/list" };
    const response = await new Promise<JsonRpcSuccess>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send(req);
    });
    return response.result;
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

// Singleton client across hot reloads
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalStore = globalThis as any;
// Use a distinct key so we don't accidentally reuse a client instance created by other routes
const MCP_KEY = "__OASIS_MCP_CLIENT_MCP__" as const;
const mcpClient: MCPClient = globalStore[MCP_KEY] ?? new MCPClient();
globalStore[MCP_KEY] = mcpClient;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as
      | { action: "list" }
      | { action: "call"; name?: string; arguments?: Record<string, unknown> };

    if (!body) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    if (body.action === "list") {
      const result = await mcpClient.listTools();
      return Response.json(result);
    }

    if (body.action === "call") {
      if (!body.name || typeof body.name !== "string") {
        return Response.json({ error: "Missing tool name" }, { status: 400 });
      }
      const result = await mcpClient.callTool(body.name, body.arguments ?? {});
      return Response.json(result);
    }

    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bad Request";
    return Response.json({ error: message }, { status: 400 });
  }
}
