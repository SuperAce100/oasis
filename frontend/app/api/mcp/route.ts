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

class MCPClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private initialized = false;
  private readonly pending = new Map<number, Pending>();
  private readonly stdoutRemainder: { value: string } = { value: "" };

  private getBackendDir(): string {
    return path.resolve(process.cwd(), "..", "backend");
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
          proc = spawn("pnpm", ["run", "dev"], {
            cwd: backendDir,
            stdio: ["pipe", "pipe", "pipe"],
          });
        }

        this.process = proc;

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
const MCP_KEY = "__OASIS_MCP_CLIENT__" as const;
const mcpClient: MCPClient = globalStore[MCP_KEY] ?? new MCPClient();
globalStore[MCP_KEY] = mcpClient;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as
      | { action: "list" }
      | { action: "call"; name?: string; arguments?: Record<string, unknown> };

    if (!body || (body as any).action === undefined) {
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
