import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage, stepCountIs } from "ai";

import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";
import { mcpToolSchemas } from "../mcp-schemas";
import { SYSTEM_PROMPT } from "@/lib/prompts";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const mcpClient = await createMCPClient({
    transport: new StdioMCPTransport({
      command: "tsx",
      args: ["../backend/src/index.ts"],
    }),
  });

  const tools = await mcpClient.tools({
    schemas: mcpToolSchemas,
  });

  const result = streamText({
    model: openai("o4-mini"),
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
