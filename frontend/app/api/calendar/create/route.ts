import { callMcpData } from "../_mcp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      calendarId?: string;
      subject: string;
      body?: string;
      start: string;
      end: string;
      attendees?: Array<{ email: string; type?: "required" | "optional" }>;
      location?: string;
      isOnlineMeeting?: boolean;
      onlineMeetingProvider?: "teamsForBusiness" | "skypeForBusiness";
      reminderMinutesBeforeStart?: number;
    };

    const data = await callMcpData(req, "calendar.create@v1", body ?? {});
    return Response.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bad Request";
    return Response.json({ error: message }, { status: 400 });
  }
}