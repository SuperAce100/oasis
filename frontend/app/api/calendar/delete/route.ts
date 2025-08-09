import { deleteEvent } from "../_store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      eventId: string;
      calendarId?: string;
    };

    const result = deleteEvent(body);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
