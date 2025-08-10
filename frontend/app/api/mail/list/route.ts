import { postJSON } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      limit?: number;
      labelIds?: string[];
      query?: string;
      unreadOnly?: boolean;
    };

    // Get the base URL for server-side API calls
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // Call the real Gmail backend via MCP
    const result = await postJSON(`${baseUrl}/api/mcp`, {
      action: "call",
      name: "list_email",
      arguments: {
        limit: body.limit || 20,
        labelIds: body.labelIds || [],
        query: body.query || "",
        unreadOnly: body.unreadOnly || false,
      },
    });

    if (result.error) {
      // If Gmail is not configured, return empty results instead of error
      if (
        result.error.includes("credentials not configured") ||
        result.error.includes("token not found")
      ) {
        console.log("Gmail not configured, returning empty results");
        return Response.json({ messages: [] });
      }
      return Response.json({ error: result.error }, { status: 400 });
    }

    // Transform Gmail response to match frontend expectations
    const emails =
      result.messages?.map((msg: any) => ({
        id: msg.id,
        mailboxId: "gmail",
        folderId: "inbox",
        from: msg.from,
        to: msg.to ? [msg.to] : [],
        subject: msg.subject,
        preview: msg.snippet || "",
        receivedDateTime: msg.date || new Date().toISOString(),
        unread: !msg.isRead,
        hasAttachments: false, // TODO: check for attachments
      })) || [];

    return Response.json({ messages: emails });
  } catch (err) {
    console.error("Mail list error:", err);
    // Return empty results on error to prevent frontend crashes
    return Response.json({ messages: [] });
  }
}
