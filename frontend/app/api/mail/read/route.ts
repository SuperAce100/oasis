import { readEmail } from "../_store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      messageId: string;
      mailboxId?: string;
      format?: "html" | "text";
    };

    if (!body?.messageId) {
      return Response.json({ error: "messageId required" }, { status: 400 });
    }

    const email = readEmail(body);
    if (!email) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(email);
  } catch (err) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
