import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  const { goal, imageBase64 } = (await req.json()) as { goal: string; imageBase64: string };
  if (!goal || !imageBase64) {
    return new Response(JSON.stringify({ error: "missing goal or imageBase64" }), { status: 400 });
  }

  const sysPrompt = [
    "You are a computer-use agent. Propose one next action as strict JSON.",
    'Valid types: click, move_mouse, type, key, run, wait, focus, done.',
    'Schema: {"type":"click|move_mouse|type|key|run|wait|focus|done","params":{...}}',
    "Only output the JSON."
  ].join("\n");

  const userPrompt = `Goal: ${goal}`;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    maxRetries: 2,
    temperature: 0.2,
    system: sysPrompt,
    input: [
      {
        type: "input_text",
        text: userPrompt,
      },
      {
        type: "input_image",
        image: { data: imageBase64, mime_type: "image/png" },
      },
    ],
  });

  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}$/);
    if (!match) return new Response(JSON.stringify({ error: "non-json" }), { status: 500 });
    parsed = JSON.parse(match[0]);
  }

  return new Response(JSON.stringify({ ok: true, action: parsed }), { status: 200 });
}