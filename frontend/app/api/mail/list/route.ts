import { listEmails, type EmailOrderBy } from "../_store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      mailboxId?: string;
      folderId?: string;
      query?: string;
      from?: string;
      unreadOnly?: boolean;
      limit?: number;
      orderBy?: EmailOrderBy;
    };

    const emails = listEmails(body ?? {});
    return Response.json(emails);
  } catch (err) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
