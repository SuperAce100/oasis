"use client";

import * as React from "react";

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type McpResultContent = { type: "json"; data: unknown } | { type: "text"; text: string };

export type McpCallResult = {
  content?: McpResultContent[];
};

type UseBackend = {
  listTools: () => Promise<McpTool[]>;
  callTool: <T = McpCallResult>(name: string, args?: Record<string, unknown>) => Promise<T>;
  terminalExecute: (params: { command: string; cwd?: string }) => Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    mode?: string;
  } | null>;
};

export function useBackend(): UseBackend {
  const listTools = React.useCallback(async (): Promise<McpTool[]> => {
    const res = await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list" }),
    });
    if (!res.ok) throw new Error("Failed to list tools");
    const data = (await res.json()) as { tools?: McpTool[] };
    return data.tools ?? [];
  }, []);

  const callTool = React.useCallback(
    async <T>(name: string, args?: Record<string, unknown>): Promise<T> => {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "call", name, arguments: args ?? {} }),
      });
      if (!res.ok) throw new Error(`Tool call failed: ${name}`);
      return (await res.json()) as T;
    },
    []
  );

  const terminalExecute = React.useCallback(
    async (params: { command: string; cwd?: string }) => {
      const result = await callTool<McpCallResult>("terminal.execute@v1", params);
      const first = Array.isArray(result?.content) ? result.content[0] : undefined;
      const data = (first && "data" in first ? (first as any).data : null) as {
        exitCode: number;
        stdout: string;
        stderr: string;
        mode?: string;
      } | null;
      return data ?? null;
    },
    [callTool]
  );

  return { listTools, callTool, terminalExecute };
}
