import { respondToEvent } from "../_store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { eventId: string; comment?: string };
    const res = respondToEvent({
      eventId: body.eventId,
      response: "tentative",
      comment: body.comment,
    });
    return Response.json(res);
  } catch (err) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
