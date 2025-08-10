// Terminal proxy API -> delegates to backend MCP server via /api/mcp
// Accepts JSON: { command: string, cwd?: string }
// Returns JSON: { stdout: string[], cwd: string } or { error: string }

import { postJSON } from "@/lib/utils";

export const dynamic = "force-dynamic";

function splitLines(text: string | undefined): string[] {
  if (!text) return [];
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

export async function POST(req: Request) {
  try {
    const { command, cwd } = (await req.json()) as { command?: string; cwd?: string };
    if (!command || typeof command !== "string") {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    // Strip leading slash from cwd if present
    const sanitizedCwd = typeof cwd === "string" ? cwd.replace(/^\/+/, "") : cwd;

    // Compute base URL for server-side self-call
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    try {
      console.log(`Calling execute_terminal in ${sanitizedCwd}`);
      const result = await postJSON(`${baseUrl}/api/mcp`, {
        action: "call",
        name: "execute_terminal",
        arguments: {
          command,
          cwd: sanitizedCwd,
        },
      });

      const first = Array.isArray(result?.content) ? result.content[0] : undefined;
      const data = first?.data as
        | { stdout?: string; stderr?: string; exitCode?: number; cwd?: string }
        | undefined;

      const outLines = [...splitLines(data?.stdout), ...splitLines(data?.stderr)].filter(
        (l) => l.length > 0
      );

      const displayCwd = typeof data?.cwd === "string" ? data.cwd : sanitizedCwd || "/";
      return Response.json({ stdout: outLines, cwd: displayCwd });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Command failed";
      return Response.json({ error: message }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
