export const runtime = "nodejs";
import { createOpenAI } from "@ai-sdk/openai";

type StepRequest = {
  goal: string;
  screenshot: string; // data URL or base64
  transcript?: Array<{ step: number; observation?: string; action?: any; result?: any }>;
};

export async function POST(req: Request) {
  const { goal, screenshot }: StepRequest = await req.json();
  if (!goal || !screenshot) {
    return new Response(JSON.stringify({ error: "goal and screenshot are required" }), { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
  }

  const openai = createOpenAI({ apiKey });

  const sys = [
    "You are a computer-use agent. Propose exactly ONE next action as strict JSON only.",
    'Allowed types: "click", "type", "key", "wait", "done".',
    'Schema: {"type":"click|type|key|wait|done","params":{...}}',
    "Coordinates are in CSS pixels relative to the captured viewport (0,0 is top-left).",
    "Respond with ONLY the JSON object. No explanations.",
  ].join("\n");

  const imageData = screenshot.startsWith("data:")
    ? screenshot.replace(/^data:[^,]+,/, "")
    : screenshot;

  const resp = await (await import("openai")).default
    .prototype.constructor({ apiKey })
    .responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: sys },
        {
          role: "user",
          content: [
            { type: "input_text", text: `Goal: ${goal}` },
            { type: "input_image", image: { data: imageData, mime_type: "image/png" } },
          ],
        },
      ],
      temperature: 0.2,
    });

  const text = (resp as any).output_text?.trim?.() ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return new Response(JSON.stringify({ error: "model-output-invalid", text }), { status: 200 });

  try {
    const action = JSON.parse(match[0]);
    return new Response(JSON.stringify({ action }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "parse-failed", text }), { status: 200 });
  }
}

