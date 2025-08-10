import { NextRequest } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

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

export async function GET(req: NextRequest) {
  if (process.platform !== "linux") {
    return new Response(JSON.stringify({ error: "Linux only" }), { status: 400 });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "screenshot-"));
  const filePath = path.join(tmpDir, "screen.png");

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
        const buf = fs.readFileSync(filePath);
        const base64 = buf.toString("base64");
        return new Response(JSON.stringify({ ok: true, imageBase64: base64, mime: "image/png", method: c.method }), {
          status: 200,
        });
      }
    }
  }

  return new Response(JSON.stringify({ ok: false, error: "No screenshot tool available" }), { status: 500 });
}