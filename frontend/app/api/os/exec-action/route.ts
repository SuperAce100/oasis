import { NextRequest } from "next/server";
import { spawn } from "child_process";

function run(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }>{
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 0, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, params } = body as { type: string; params?: Record<string, any> };

  try {
    switch (type) {
      case "click": {
        const { x, y, button = 1 } = params || {};
        if (x == null || y == null) return Response.json({ ok: false, error: "missing x/y" }, { status: 400 });
        const move = await run("xdotool", ["mousemove", String(x), String(y)]);
        const click = await run("xdotool", ["click", String(button)]);
        return Response.json({ ok: move.code === 0 && click.code === 0, detail: { move, click } });
      }
      case "move_mouse": {
        const { x, y } = params || {};
        if (x == null || y == null) return Response.json({ ok: false, error: "missing x/y" }, { status: 400 });
        const res = await run("xdotool", ["mousemove", String(x), String(y)]);
        return Response.json({ ok: res.code === 0, detail: res });
      }
      case "type": {
        const { text } = params || {};
        if (!text) return Response.json({ ok: false, error: "missing text" }, { status: 400 });
        const res = await run("xdotool", ["type", "--delay", "1", "--clearmodifiers", String(text)]);
        return Response.json({ ok: res.code === 0, detail: res });
      }
      case "key": {
        const { key } = params || {};
        if (!key) return Response.json({ ok: false, error: "missing key" }, { status: 400 });
        const res = await run("xdotool", ["key", "--clearmodifiers", String(key)]);
        return Response.json({ ok: res.code === 0, detail: res });
      }
      case "run": {
        const { command } = params || {};
        if (!command) return Response.json({ ok: false, error: "missing command" }, { status: 400 });
        const res = await run("bash", ["-lc", String(command)]);
        return Response.json({ ok: res.code === 0, detail: res });
      }
      case "focus": {
        const { name, klass } = params || {};
        if (klass) {
          const res = await run("wmctrl", ["-x", "-a", String(klass)]);
          return Response.json({ ok: res.code === 0, detail: res });
        }
        if (name) {
          const res = await run("wmctrl", ["-a", String(name)]);
          return Response.json({ ok: res.code === 0, detail: res });
        }
        return Response.json({ ok: false, error: "missing name/class" }, { status: 400 });
      }
      case "wait": {
        const { ms = 500 } = params || {};
        await new Promise((r) => setTimeout(r, Number(ms)));
        return Response.json({ ok: true, detail: { waitedMs: Number(ms) } });
      }
      default:
        return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}