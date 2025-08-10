import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { JSONSchemaType } from "ajv";
import { validateOrThrow } from "../utils/ajv.js";
import { BAD_REQUEST, INTERNAL_ERROR } from "../utils/errors.js";
import type { LogContext } from "../utils/logger.js";
import { emitProgress } from "../utils/logger.js";

// Lazy import to avoid requiring OPENAI env when tool unused
let OpenAIClient: any = null;

export interface DoAnythingArgs {
  goal: string;
  maxSteps?: number;
  dryRun?: boolean;
  stepDelayMs?: number;
  // Optional base64 screenshot (or data URL) captured by the FRONTEND.
  // If provided, we will use it as the observation instead of taking a native OS screenshot.
  screenshot?: string | null;
  // If true while screenshot is provided, we will still attempt native execution when possible (Linux+xdotool).
  // Defaults to false for safety in frontend-driven mode.
  allowExecution?: boolean;
}

const DO_ANYTHING_SCHEMA: JSONSchemaType<DoAnythingArgs> = {
  type: "object",
  properties: {
    goal: { type: "string", minLength: 1 },
    maxSteps: { type: "number", minimum: 1, maximum: 50, nullable: true },
    dryRun: { type: "boolean", nullable: true },
    stepDelayMs: { type: "number", minimum: 0, maximum: 60000, nullable: true },
    screenshot: { type: "string", nullable: true },
    allowExecution: { type: "boolean", nullable: true },
  },
  required: ["goal"],
  additionalProperties: false,
};

function run(
  command: string,
  args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) =>
      resolve({ code: code ?? 0, stdout: stdout.trim(), stderr: stderr.trim() })
    );
  });
}

async function takeScreenshot(): Promise<{ filePath: string; method: string }> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "do-anything-"));
  const filePath = path.join(tmpDir, "screenshot.png");

  // Try common Linux tools
  const candidates: Array<{ cmd: string; args: string[]; method: string }> = [
    { cmd: "scrot", args: [filePath], method: "scrot" },
    { cmd: "gnome-screenshot", args: ["-f", filePath], method: "gnome-screenshot" },
    { cmd: "import", args: ["-window", "root", filePath], method: "imagemagick-import" },
  ];

  for (const c of candidates) {
    const which = await run("bash", ["-lc", `command -v ${c.cmd}`]);
    if (which.code === 0) {
      const res = await run(c.cmd, c.args);
      if (res.code === 0 && fs.existsSync(filePath)) {
        return { filePath, method: c.method };
      }
    }
  }

  throw BAD_REQUEST(
    "No screenshot tool available (need scrot, gnome-screenshot, or ImageMagick import)"
  );
}

type ProposedAction = {
  type: "click" | "type" | "key" | "move_mouse" | "run" | "wait" | "focus" | "done";
  params?: Record<string, any>;
};

async function executeAction(action: ProposedAction): Promise<{ ok: boolean; detail: any }> {
  switch (action.type) {
    case "click": {
      const { x, y, button = 1 } = action.params || {};
      if (x == null || y == null) return { ok: false, detail: "missing x/y" };
      const move = await run("xdotool", ["mousemove", String(x), String(y)]);
      const click = await run("xdotool", ["click", String(button)]);
      return { ok: move.code === 0 && click.code === 0, detail: { move, click } };
    }
    case "move_mouse": {
      const { x, y } = action.params || {};
      if (x == null || y == null) return { ok: false, detail: "missing x/y" };
      const res = await run("xdotool", ["mousemove", String(x), String(y)]);
      return { ok: res.code === 0, detail: res };
    }
    case "type": {
      const { text } = action.params || {};
      if (!text) return { ok: false, detail: "missing text" };
      const res = await run("xdotool", ["type", "--delay", "1", "--clearmodifiers", String(text)]);
      return { ok: res.code === 0, detail: res };
    }
    case "key": {
      const { key } = action.params || {};
      if (!key) return { ok: false, detail: "missing key" };
      const res = await run("xdotool", ["key", "--clearmodifiers", String(key)]);
      return { ok: res.code === 0, detail: res };
    }
    case "run": {
      const { command } = action.params || {};
      if (!command) return { ok: false, detail: "missing command" };
      const res = await run("bash", ["-lc", String(command)]);
      return { ok: res.code === 0, detail: res };
    }
    case "wait": {
      const { ms = 500 } = action.params || {};
      await new Promise((r) => setTimeout(r, Number(ms)));
      return { ok: true, detail: { waitedMs: Number(ms) } };
    }
    case "focus": {
      const { name, klass } = action.params || {};
      if (klass) {
        const res = await run("wmctrl", ["-x", "-a", String(klass)]);
        return { ok: res.code === 0, detail: res };
      }
      if (name) {
        const res = await run("wmctrl", ["-a", String(name)]);
        return { ok: res.code === 0, detail: res };
      }
      return { ok: false, detail: "missing name/class" };
    }
    case "done":
      return { ok: true, detail: { message: "done" } };
  }
}

export async function handleDoAnything(args: unknown, context: LogContext) {
  emitProgress(1, 6, "validating input");
  const { goal, maxSteps = 15, dryRun = false, stepDelayMs = 250, screenshot, allowExecution = false } =
    validateOrThrow(DO_ANYTHING_SCHEMA, args, "do_anything");

  if (!process.env.OPENAI_API_KEY) {
    throw BAD_REQUEST("OPENAI_API_KEY not configured");
  }

  // Frontend-driven mode: when a screenshot is provided, we can run on any OS.
  // Native execution will only be attempted if allowExecution is true AND platform supports it.
  const frontendDriven = !!screenshot;
  const canExecuteNatively = !frontendDriven && process.platform === "linux";
  const executionEnabled =
    canExecuteNatively || (frontendDriven && allowExecution && process.platform === "linux");
  if (!frontendDriven && process.platform !== "linux") {
    throw BAD_REQUEST("do_anything requires Linux when a frontend screenshot is not provided");
  }

  if (!OpenAIClient) {
    // dynamic import to keep optional
    const mod = await import("openai");
    OpenAIClient = mod.default;
  }
  const openai = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });

  const transcript: Array<any> = [];
  let lastScreenshotPath: string | null = null;
  // If the screenshot is provided by the frontend, normalize it to base64 (strip data URL prefix if present)
  const providedImageBase64 = (() => {
    if (!screenshot) return null;
    const trimmed = screenshot.trim();
    const commaIdx = trimmed.indexOf(',');
    if (trimmed.startsWith('data:') && commaIdx !== -1) {
      return trimmed.slice(commaIdx + 1);
    }
    return trimmed;
  })();

  const effectiveMaxSteps = frontendDriven ? Math.min(1, maxSteps) : maxSteps;

  for (let step = 1; step <= effectiveMaxSteps; step++) {
    emitProgress(2, 6, `step ${step}: screenshot`);
    let imageBase64: string;
    if (providedImageBase64) {
      imageBase64 = providedImageBase64;
    } else {
      const shot = await takeScreenshot();
      lastScreenshotPath = shot.filePath;
      const imageBytes = fs.readFileSync(shot.filePath);
      imageBase64 = imageBytes.toString("base64");
    }

    emitProgress(3, 6, `step ${step}: propose action`);

    // Ask model to propose single next action as JSON
    const sysPrompt = [
      "You are a computer-use agent. You can propose one next action at a time as strict JSON.",
      "Valid action types: click, move_mouse, type, key, run, wait, focus, done.",
      'Schema: {"type":"click|move_mouse|type|key|run|wait|focus|done","params":{...}}. Do not include extra fields.',
      "Coordinates are in absolute screen pixels. Use short incremental steps and observe new screenshots.",
      "Reply with only the JSON. Do not add explanations.",
    ].join("\n");

    const userPrompt = [`Goal: ${goal}`, `Step: ${step}/${maxSteps}`].join("\n");

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: sysPrompt },
        {
          role: "user",
          content: [
            { type: "input_text", text: userPrompt },
            { type: "input_image", image: { data: imageBase64, mime_type: "image/png" } },
          ],
        },
      ],
      temperature: 0.2,
    });

    const outText = response.output_text?.trim() || "";
    let proposed: ProposedAction;
    try {
      proposed = JSON.parse(outText);
    } catch (e) {
      // Best-effort: try to extract JSON
      const match = outText.match(/\{[\s\S]*\}$/);
      if (!match) throw INTERNAL_ERROR(`Model returned non-JSON output at step ${step}`);
      proposed = JSON.parse(match[0]);
    }

    transcript.push({ step, proposed });

    if (proposed.type === "done") {
      emitProgress(4, 6, `step ${step}: done`);
      return {
        content: [
          {
            type: "json",
            data: {
              goal,
              steps: step,
              done: true,
              transcript,
              lastScreenshotPath,
              dryRun,
              frontendDriven,
            },
          },
        ],
      };
    }

    emitProgress(4, 6, `step ${step}: ${dryRun ? "dry-run action" : "execute action"}`);

    let execResult: any = { skipped: true };
    if (!dryRun) {
      if (executionEnabled) {
        execResult = await executeAction(proposed);
        (transcript as any)[(transcript as any).length - 1].execution = execResult;
      } else {
        // Signal UI to execute this action client-side
        (transcript as any)[(transcript as any).length - 1].uiIntent = {
          action: "ui_action",
          args: proposed,
        };
      }
    }

    if (step < effectiveMaxSteps) {
      emitProgress(5, 6, `step ${step}: wait`);
      await new Promise((r) => setTimeout(r, stepDelayMs));
    }
  }

  emitProgress(6, 6, "max steps reached");
  return {
    content: [
      {
        type: "json",
        data: {
          goal,
          steps: effectiveMaxSteps,
          done: false,
          reason: "max_steps",
          transcript,
          frontendDriven,
        },
      },
    ],
  };
}
