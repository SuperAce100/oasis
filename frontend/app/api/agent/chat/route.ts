export const runtime = "nodejs";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage, stepCountIs } from "ai";
import { z } from "zod";

import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";
import * as fs from "node:fs";
import * as path from "node:path";
import { mcpToolSchemas } from "../mcp-schemas";
import { SYSTEM_PROMPT } from "@/lib/prompts";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  // Prefer running the built backend to avoid relying on tsx presence in this runtime
  const backendDir = path.resolve(process.cwd(), "..", "backend");
  const distEntry = path.join(backendDir, "dist", "index.js");
  const command = "node";
  const args = [distEntry];
  if (!fs.existsSync(distEntry)) {
    throw new Error("Backend dist/index.js not found. Run `cd backend && npm run build`. ");
  }

  // Load env from backend/.env and ensure critical vars are present before spawning MCP process
  let backendEnvText = "";
  try {
    backendEnvText = fs.readFileSync(path.join(backendDir, ".env"), "utf8");
  } catch {}
  const parsedBackendEnv: Record<string, string> = {};
  if (backendEnvText) {
    for (const line of backendEnvText.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (m) {
        const key = m[1];
        let value = m[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        parsedBackendEnv[key] = value;
      }
    }
  }

  // Ensure OPENAI_API_KEY for the model call
  let apiKey = process.env.OPENAI_API_KEY || parsedBackendEnv["OPENAI_API_KEY"];
  if (apiKey) process.env.OPENAI_API_KEY = apiKey;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not found in env" }), {
      status: 500,
    });
  }

  // Ensure Slack token is available to the spawned MCP server so Slack tools register
  if (!process.env.SLACK_BOT_TOKEN && parsedBackendEnv["SLACK_BOT_TOKEN"]) {
    process.env.SLACK_BOT_TOKEN = parsedBackendEnv["SLACK_BOT_TOKEN"];
  }

  // Build a string-only env object for the child process
  const envForChild: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") envForChild[k] = v;
  }

  // Spawn MCP server with backend cwd and inherited env (now populated)
  const mcpClient = await createMCPClient({
    transport: new StdioMCPTransport({
      command,
      args,
      cwd: backendDir,
      env: envForChild,
    }),
  });

  const mcpTools = await mcpClient.tools({
    schemas: mcpToolSchemas,
  });

  const openai = createOpenAI({ apiKey, baseURL: "https://api.openai.com/v1" });

  const tools = mcpTools;

  const result = streamText({
    model: openai("gpt-4.1-mini"),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
      },
    },
    tools,
    onFinish: async () => {
      await mcpClient.close();
    },
    stopWhen: stepCountIs(100),
  });

  return result.toUIMessageStreamResponse();
}
