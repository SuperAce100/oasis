export const runtime = "nodejs";
import { createOpenAI } from "@ai-sdk/openai";

export async function POST(req: Request) {
  const { goal, screenshot }: { goal: string; screenshot: string } = await req.json();
  if (!goal || !screenshot) {
    return new Response(JSON.stringify({ error: "goal and screenshot are required" }), { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
  }

  const openai = createOpenAI({ apiKey });

  const sys = [
    "You are a computer-use agent. Propose exactly one next action as strict JSON.",
    'Allowed types: "click", "type", "key", "wait", "done".',
    'Schema: {"type":"click|type|key|wait|done","params":{...}}',
    "Coordinates are in CSS pixels of the captured viewport.",
    "Reply with ONLY the JSON, no extra text.",
  ].join("\n");

  // Use non-streaming response and return parsed JSON action
  const resp = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      { role: "system", content: sys },
      {
        role: "user",
        content: [
          { type: "input_text", text: `Goal: ${goal}` },
          { type: "input_image", image: { data: screenshot.replace(/^data:[^,]+,/, ""), mime_type: "image/png" } },
        ],
      },
    ],
    temperature: 0.2,
  });

  const text = (resp as any).output_text?.trim?.() ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return new Response(JSON.stringify({ error: "model-output-invalid", text }), { status: 200 });
  }
  let action: any = null;
  try {
    action = JSON.parse(match[0]);
  } catch {
    return new Response(JSON.stringify({ error: "parse-failed", text }), { status: 200 });
  }
  return new Response(JSON.stringify({ action }), { status: 200 });
}

