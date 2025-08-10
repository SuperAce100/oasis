import { postJSON } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      format?: "html" | "text";
    };

    if (!body.to || !body.subject || !body.body) {
      return Response.json({ error: "To, subject, and body are required" }, { status: 400 });
    }

    // Get the base URL for server-side API calls
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // Call the real Gmail backend via MCP
    const result = await postJSON(`${baseUrl}/api/mcp`, {
      action: "call",
      name: "send_email",
      arguments: {
        to: body.to,
        cc: body.cc || [],
        bcc: body.bcc || [],
        subject: body.subject,
        body: body.body,
        format: body.format || "text",
      },
    });

    if (result.error) {
      // If Gmail is not configured, provide helpful error message
      if (
        result.error.includes("credentials not configured") ||
        result.error.includes("token not found")
      ) {
        return Response.json(
          {
            error: "Gmail not configured. Please set up Gmail credentials in the backend.",
          },
          { status: 400 }
        );
      }
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({
      id: result.messageId,
      success: true,
      message: "Email sent successfully",
    });
  } catch (err) {
    console.error("Mail send error:", err);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}
