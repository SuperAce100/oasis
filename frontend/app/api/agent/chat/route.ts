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
  const mcpClient = await createMCPClient({
    transport: new StdioMCPTransport({ command, args }),
  });

  const mcpTools = await mcpClient.tools({
    schemas: mcpToolSchemas,
  });

  // Resolve OpenAI API key (frontend env or fallback to backend/.env)
  let apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    try {
      const envText = fs.readFileSync(path.resolve(process.cwd(), "..", "backend", ".env"), "utf8");
      const match = envText.split(/\r?\n/).find((l) => l.startsWith("OPENAI_API_KEY="));
      if (match) apiKey = match.replace("OPENAI_API_KEY=", "").trim();
    } catch {}
  }
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not found in env" }), {
      status: 500,
    });
  }
  const openai = createOpenAI({ apiKey, baseURL: "https://api.openai.com/v1" });

  // For stability, use only server-provided MCP tools for now
  const tools = mcpTools;

  const result = streamText({
    model: openai("gpt-5-mini"),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
      },
    },
    tools,
    onFinish: async (message) => {
      await mcpClient.close();
    },
    stopWhen: stepCountIs(100),
  });

  return result.toUIMessageStreamResponse();
}
