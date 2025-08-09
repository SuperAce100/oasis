export const dynamic = "force-dynamic";

export async function callMcpRaw<T>(req: Request, name: string, args: Record<string, unknown>): Promise<T> {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  const url = `${proto}://${host}/api/mcp`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "call", name, arguments: args ?? {} }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "MCP call failed");
  }

  return (await res.json()) as T;
}

export async function callMcpData<T>(
  req: Request,
  name: string,
  args: Record<string, unknown>
): Promise<T> {
  const result = (await callMcpRaw<{
    content?: Array<{ type: string; data?: unknown; text?: string }>;
  }>(req, name, args));
  const first = Array.isArray(result?.content) ? result.content[0] : undefined;
  if (first && typeof first === "object" && first && "data" in first) {
    return (first.data as T) ?? (undefined as unknown as T);
  }
  return (result as unknown as T);
}