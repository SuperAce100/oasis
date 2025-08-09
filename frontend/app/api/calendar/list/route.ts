import { listEvents, type CalendarOrderBy } from "../_store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      calendarId?: string;
      start?: string;
      end?: string;
      query?: string;
      limit?: number;
      orderBy?: CalendarOrderBy;
    };

    const events = listEvents(body ?? {});
    return Response.json(events);
  } catch (err) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
