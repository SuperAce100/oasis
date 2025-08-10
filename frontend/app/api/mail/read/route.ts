import { postJSON } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      messageId: string;
      format?: "html" | "text";
    };

    if (!body.messageId) {
      return Response.json({ error: "Message ID is required" }, { status: 400 });
    }

    // Get the base URL for server-side API calls
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // Call the real Gmail backend via MCP
    const result = await postJSON(`${baseUrl}/api/mcp`, {
      action: "call",
      name: "read_email",
      arguments: {
        messageId: body.messageId,
        format: body.format || "full",
      },
    });

    if (result.error) {
      // If Gmail is not configured, return not found instead of error
      if (
        result.error.includes("credentials not configured") ||
        result.error.includes("token not found")
      ) {
        console.log("Gmail not configured, returning not found");
        return Response.json({ error: "Message not found" }, { status: 404 });
      }
      return Response.json({ error: result.error }, { status: 400 });
    }

    const msg = result.message;
    if (!msg) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    // Transform Gmail response to match frontend expectations
    const email = {
      id: msg.id,
      mailboxId: "gmail",
      folderId: "inbox",
      from: msg.from,
      to: msg.to ? [msg.to] : [],
      cc: msg.cc ? [msg.cc] : [],
      bcc: msg.bcc ? [msg.bcc] : [],
      subject: msg.subject,
      preview: msg.snippet || "",
      receivedDateTime: msg.date || new Date().toISOString(),
      unread: !msg.isRead,
      hasAttachments: false, // TODO: check for attachments
      bodyText: msg.format === "text" ? msg.body : undefined,
      bodyHtml: msg.format === "html" ? msg.body : undefined,
      headers: {
        "Message-Id": msg.id,
        From: msg.from,
        To: msg.to,
        Subject: msg.subject,
        Date: msg.date,
      },
      attachments: [],
    };

    return Response.json({ message: email });
  } catch (err) {
    console.error("Mail read error:", err);
    return Response.json({ error: "Message not found" }, { status: 404 });
  }
}
