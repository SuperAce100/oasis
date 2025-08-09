import { createEvent } from "../_store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      calendarId?: string;
      subject: string;
      start: string;
      end: string;
      body?: string;
      location?: string;
      attendees?: Array<{ email: string; type?: "required" | "optional" }>;
      isOnlineMeeting?: boolean;
      reminderMinutesBeforeStart?: number;
    };

    const event = createEvent(body);
    return Response.json(event);
  } catch (err) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
