import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage, stepCountIs, tool } from "ai";

import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";
import { mcpToolSchemas } from "../mcp-schemas";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

async function callJSON(route: string, body: any, method: "POST" | "GET" = "POST") {
  const resp = await fetch(route, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
    // Ensure server-only route call from API route
    cache: "no-store",
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `Request failed: ${resp.status}`);
  return data;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const mcpClient = await createMCPClient({
    transport: new StdioMCPTransport({
      command: "tsx",
      args: ["../backend/src/index.ts"],
    }),
  });

  const tools = await mcpClient.tools({ schemas: mcpToolSchemas });

  // Client-side tools (exposed from frontend via AI SDK)
  const openAppTool = tool({
    description: "Open an application or focus its window on the desktop (Linux only).",
    parameters: z.object({
      target: z.string().min(1),
      action: z.enum(["open", "focus"]).default("open"),
      hintClass: z.string().optional(),
    }),
    execute: async ({ target, action, hintClass }) => {
      const result = await callJSON("/api/os/open-app", { target, action, hintClass });
      return result;
    },
  });

  const doAnythingTool = tool({
    description:
      "Spawn a computer-use agent: screenshot + vision model to propose and optionally execute actions in a loop.",
    parameters: z.object({
      goal: z.string().min(1),
      maxSteps: z.number().int().min(1).max(50).default(15),
      dryRun: z.boolean().default(false),
      stepDelayMs: z.number().int().min(0).max(60000).default(250),
    }),
    execute: async ({ goal, maxSteps, dryRun, stepDelayMs }) => {
      const transcript: any[] = [];
      let lastImageBase64: string | null = null;

      for (let step = 1; step <= maxSteps; step++) {
        const shot = await fetch("/api/os/screenshot", { cache: "no-store" }).then((r) => r.json());
        if (!shot?.ok) throw new Error("screenshot failed");
        lastImageBase64 = shot.imageBase64 as string;

        const proposal = await callJSON("/api/agent/propose-action", { goal, imageBase64: lastImageBase64 });
        const action = proposal.action as { type: string; params?: Record<string, any> };
        transcript.push({ step, proposed: action });

        if (action.type === "done") {
          return { goal, steps: step, done: true, transcript, lastImageBase64, dryRun };
        }

        if (!dryRun) {
          const execRes = await callJSON("/api/os/exec-action", { type: action.type, params: action.params });
          transcript[transcript.length - 1].execution = execRes;
        }

        if (step < maxSteps) {
          await new Promise((r) => setTimeout(r, stepDelayMs));
        }
      }

      return { goal, steps: maxSteps, done: false, reason: "max_steps", transcript };
    },
  });

  const result = streamText({
    model: openai("gpt-5-mini"),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    providerOptions: { openai: { reasoningSummary: "auto" } },
    tools: { ...tools, open_app: openAppTool, do_anything: doAnythingTool },
    onFinish: async () => {
      await mcpClient.close();
    },
    stopWhen: stepCountIs(20),
  });

  return result.toUIMessageStreamResponse();
}
