export const runtime = "nodejs";
import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";

type LoopRequest = {
  sessionId: string;
  goal: string;
  screenshot: string; // data URL or base64
  previousResponseId?: string;
  lastCallId?: string;
  acknowledgedSafetyChecks?: Array<{ id: string; code: string; message?: string }>;
};

export async function POST(req: Request) {
  const {
    sessionId,
    goal,
    screenshot,
    previousResponseId,
    lastCallId,
    acknowledgedSafetyChecks = [],
  }: LoopRequest = await req.json();

  if (!sessionId || !goal || !screenshot) {
    return new Response(JSON.stringify({ error: "sessionId, goal, screenshot required" }), { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });

  const client = new OpenAI({ apiKey });

  const tools = [
    {
      type: "computer_use_preview",
      display_width: 1280,
      display_height: 800,
      environment: "browser",
    },
  ] as any;

  const imageData = screenshot.startsWith("data:")
    ? screenshot.replace(/^data:[^,]+,/, "")
    : screenshot;

  const input: any[] = [];
  if (!previousResponseId) {
    input.push({
      role: "user",
      content: [
        { type: "input_text", text: `Goal: ${goal}` },
        { type: "input_image", image: { data: imageData, mime_type: "image/png" } },
      ],
    });
  } else {
    input.push({
      type: "computer_call_output",
      call_id: lastCallId,
      acknowledged_safety_checks: acknowledgedSafetyChecks,
      output: { type: "computer_screenshot", image_url: `data:image/png;base64,${imageData}` },
    });
  }

  const response = await client.responses.create({
    model: "computer-use-preview",
    tools,
    input,
    truncation: "auto",
    reasoning: { summary: "concise" },
    previous_response_id: previousResponseId,
  });

  return Response.json(response);
}

