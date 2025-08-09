import { sendEmail } from "../_store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      mailboxId?: string;
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      format?: "html" | "text";
      attachments?: Array<{ filename: string; contentBytes: string; mimeType?: string }>;
    };

    if (!Array.isArray(body?.to) || !body?.subject || !body?.body) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const res = sendEmail(body);
    return Response.json(res);
  } catch (err) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
