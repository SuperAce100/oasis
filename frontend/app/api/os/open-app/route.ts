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
  if (process.platform !== "linux") {
    return new Response(JSON.stringify({ error: "Linux only" }), { status: 400 });
  }

  const { target, action = "open", hintClass }: { target: string; action?: "open" | "focus"; hintClass?: string } =
    await req.json();

  if (!target || typeof target !== "string") {
    return new Response(JSON.stringify({ error: "invalid target" }), { status: 400 });
  }

  const attempted: Array<{ cmd: string; args: string[]; code: number; stdout: string; stderr: string }> = [];

  try {
    if (action === "open") {
      let res = await run(target, []);
      attempted.push({ cmd: target, args: [], ...res });

      if (res.code !== 0) {
        res = await run("gtk-launch", [target]);
        attempted.push({ cmd: "gtk-launch", args: [target], ...res });
      }

      if (attempted[attempted.length - 1].code !== 0) {
        const res2 = await run("xdg-open", [target]);
        attempted.push({ cmd: "xdg-open", args: [target], ...res2 });
      }

      const final = attempted[attempted.length - 1];
      if (final.code !== 0) {
        return new Response(JSON.stringify({ ok: false, attempted }), { status: 500 });
      }
    } else {
      let used = false;
      if (hintClass) {
        const res = await run("wmctrl", ["-x", "-a", hintClass]);
        attempted.push({ cmd: "wmctrl", args: ["-x", "-a", hintClass], ...res });
        used = true;
      }

      if (!used || attempted[attempted.length - 1].code !== 0) {
        const res = await run("wmctrl", ["-a", target]);
        attempted.push({ cmd: "wmctrl", args: ["-a", target], ...res });
      }

      if (attempted[attempted.length - 1].code !== 0) {
        const search = await run("xdotool", ["search", "--name", target]);
        attempted.push({ cmd: "xdotool", args: ["search", "--name", target], ...search });
        const winId = search.stdout.split(/\s+/)[0];
        if (winId) {
          const act = await run("xdotool", ["windowactivate", winId]);
          attempted.push({ cmd: "xdotool", args: ["windowactivate", winId], ...act });
        }
      }

      const final = attempted[attempted.length - 1];
      if (final.code !== 0) {
        return new Response(JSON.stringify({ ok: false, attempted }), { status: 500 });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, target, action, attempted, timestamp: new Date().toISOString() }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), attempted }), { status: 500 });
  }
}