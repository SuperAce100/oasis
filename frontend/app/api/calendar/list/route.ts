import { callMcpData } from "../_mcp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      calendarId?: string;
      start?: string;
      end?: string;
      query?: string;
      includeCancelled?: boolean;
      limit?: number;
      orderBy?: "start" | "createdDateTime";
    };

    const data = await callMcpData(req, "calendar.list@v1", body ?? {});
    return Response.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bad Request";
    return Response.json({ error: message }, { status: 400 });
  }
}