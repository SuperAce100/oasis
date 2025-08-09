import { searchEmails } from "../_store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      mailboxId?: string;
      query: string;
      from?: string;
      to?: string;
      subjectContains?: string;
      since?: string;
      until?: string;
      limit?: number;
    };

    const emails = searchEmails(body ?? { query: "" });
    return Response.json(emails);
  } catch (err) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
