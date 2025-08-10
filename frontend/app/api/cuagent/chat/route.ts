export const runtime = "nodejs";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage, stepCountIs } from "ai";
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// This is a dedicated chat endpoint for the Computer Use Agent (CUA).
// It exposes a minimal tool: `cu_step` which takes a goal and performs one CUA loop iteration
// by calling our internal /api/cuagent/loop endpoint.

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Resolve key (frontend env or backend/.env fallback)
  let apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    try {
      const envText = fs.readFileSync(path.resolve(process.cwd(), "..", "backend", ".env"), "utf8");
      const match = envText.split(/\r?\n/).find((l) => l.startsWith("OPENAI_API_KEY="));
      if (match) apiKey = match.replace("OPENAI_API_KEY=", "").trim();
    } catch {}
  }
  if (!apiKey) return new Response(JSON.stringify({ error: "OPENAI_API_KEY not found" }), { status: 500 });

  const openai = createOpenAI({ apiKey });

  const result = streamText({
    model: openai("gpt-5-mini"),
    system:
      "You are the Oasis Computer Use Agent. Use the cu_step tool to advance the goal on the current page. Keep responses brief.",
    messages: convertToModelMessages(messages),
    tools: {},
    onFinish: async () => {},
    stopWhen: stepCountIs(20),
  });

  return result.toUIMessageStreamResponse();
}

