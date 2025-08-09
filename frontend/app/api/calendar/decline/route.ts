import { callMcpData } from "../_mcp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      eventId: string;
      calendarId?: string;
      comment?: string;
      sendResponse?: boolean;
    };

    const data = await callMcpData(req, "calendar.decline@v1", body ?? {});
    return Response.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bad Request";
    return Response.json({ error: message }, { status: 400 });
  }
}