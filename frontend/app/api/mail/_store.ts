// In-memory mock mail store for demo purposes
// Provides basic list, search, read, and send capabilities

export const dynamic = "force-dynamic";

export type EmailOrderBy = "receivedDateTime" | "subject";

export type EmailAttachment = {
  id: string;
  filename: string;
  mimeType?: string;
  contentBytes: string; // base64
  size?: number;
};

export type EmailSummary = {
  id: string;
  mailboxId: string;
  folderId: string;
  from: string;
  to: string[];
  subject: string;
  preview: string;
  receivedDateTime: string; // ISO
  unread: boolean;
  hasAttachments?: boolean;
};

export type EmailMessage = EmailSummary & {
  cc?: string[];
  bcc?: string[];
  bodyText?: string;
  bodyHtml?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
};

type MailFolder = { id: string; name: string };
type Mailbox = { id: string; name: string; folders: MailFolder[] };

type MailDB = {
  mailboxes: Mailbox[];
  messages: Record<string, EmailMessage>; // id -> message
};

const GLOBAL_KEY = "__OASIS_MAIL_DB__" as const;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny = globalThis as any;

function createInitialDB(): MailDB {
  const defaultMailbox: Mailbox = {
    id: "default",
    name: "Personal",
    folders: [
      { id: "inbox", name: "Inbox" },
      { id: "sent", name: "Sent" },
      { id: "archive", name: "Archive" },
      { id: "trash", name: "Trash" },
    ],
  };

  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const messages: EmailMessage[] = [
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "inbox",
      from: "Oasis Team <hello@oasis.local>",
      to: ["you@example.com"],
      subject: "Welcome to Oasis OS",
      preview: "Thanks for trying our OS demo!",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 2)),
      unread: true,
      bodyText:
        "Thanks for trying our OS demo! This is a welcome message. You can reply, search, and more.",
      bodyHtml:
        "<p>Thanks for trying our <strong>Oasis OS</strong> demo! This is a welcome message. You can reply, search, and more.</p>",
      headers: {
        "Message-Id": `<${crypto.randomUUID()}@oasis.local>`,
        "X-Mailer": "Oasis Mailer",
      },
      attachments: [],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "inbox",
      from: "Calendar <noreply@calendar.local>",
      to: ["you@example.com"],
      subject: "Event reminder: Standup 10:00 AM",
      preview: "Reminder for daily standup at 10:00 AM",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 30)),
      unread: true,
      bodyText: "Reminder: Daily standup at 10:00 AM.",
      bodyHtml: "<p>Reminder: Daily standup at <strong>10:00 AM</strong>.</p>",
      headers: {
        "Message-Id": `<${crypto.randomUUID()}@calendar.local>`,
      },
      attachments: [],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "inbox",
      from: "Uber <receipts@uber.com>",
      to: ["you@example.com"],
      subject: "Your receipt from last night",
      preview: "Thanks for riding with Uber",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 20)),
      unread: false,
      bodyText: "Trip receipt attached.",
      bodyHtml: "<p>Trip receipt attached.</p>",
      headers: {
        "Message-Id": `<${crypto.randomUUID()}@uber.com>`,
      },
      attachments: [
        {
          id: crypto.randomUUID(),
          filename: "receipt.pdf",
          mimeType: "application/pdf",
          contentBytes: "",
          size: 1024,
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "inbox",
      from: "GitHub <noreply@github.com>",
      to: ["you@example.com"],
      subject: "[oasis/frontend] PR #42 updated",
      preview: "chore: bump deps and fix build",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 6)),
      unread: false,
      bodyText: "A pull request has new commits.",
      bodyHtml: "<p>A pull request has new commits.</p>",
      headers: { "Message-Id": `<${crypto.randomUUID()}@github.com>` },
      attachments: [],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "inbox",
      from: "Notion <team@notion.so>",
      to: ["you@example.com"],
      subject: "Your weekly workspace digest",
      preview: "3 pages changed, 2 new comments",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 26)),
      unread: true,
      bodyText: "Here's what changed in your Notion workspace.",
      bodyHtml: "<p>Here's what changed in your <strong>Notion</strong> workspace.</p>",
      headers: { "Message-Id": `<${crypto.randomUUID()}@notion.so>` },
      attachments: [],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "inbox",
      from: "Slack <no-reply@slack.com>",
      to: ["you@example.com"],
      subject: "Missed 14 messages in #engineering",
      preview: "Catch up on your conversations",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 48)),
      unread: false,
      bodyText: "Catch up on your Slack conversations.",
      bodyHtml: "<p>Catch up on your Slack conversations.</p>",
      headers: { "Message-Id": `<${crypto.randomUUID()}@slack.com>` },
      attachments: [],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "inbox",
      from: "Bank <alerts@bank.example>",
      to: ["you@example.com"],
      subject: "Your monthly statement is ready",
      preview: "Statement for September available",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10)),
      unread: false,
      bodyText: "Download your monthly statement.",
      bodyHtml: "<p>Download your monthly statement.</p>",
      headers: { "Message-Id": `<${crypto.randomUUID()}@bank.example>` },
      attachments: [
        {
          id: crypto.randomUUID(),
          filename: "statement-sep.pdf",
          mimeType: "application/pdf",
          contentBytes: "",
          size: 2048,
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "sent",
      from: "you@example.com",
      to: ["team@example.com"],
      subject: "Slides for tomorrow",
      preview: "Please find the deck attached.",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 20)),
      unread: false,
      bodyText: "Please find the deck attached.",
      bodyHtml: "<p>Please find the deck attached.</p>",
      headers: { "Message-Id": `<${crypto.randomUUID()}@oasis.local>` },
      attachments: [
        {
          id: crypto.randomUUID(),
          filename: "deck.pdf",
          mimeType: "application/pdf",
          contentBytes: "",
          size: 4096,
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "sent",
      from: "you@example.com",
      to: ["manager@example.com"],
      subject: "Status update",
      preview: "Here is the weekly status update.",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 70)),
      unread: false,
      bodyText: "Here is the weekly status update.",
      bodyHtml: "<p>Here is the weekly status update.</p>",
      headers: { "Message-Id": `<${crypto.randomUUID()}@oasis.local>` },
      attachments: [],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "archive",
      from: "Airline <no-reply@air.example>",
      to: ["you@example.com"],
      subject: "Trip itinerary",
      preview: "Your itinerary and boarding pass",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 40)),
      unread: false,
      bodyText: "Your itinerary is attached.",
      bodyHtml: "<p>Your itinerary is attached.</p>",
      headers: { "Message-Id": `<${crypto.randomUUID()}@air.example>` },
      attachments: [
        {
          id: crypto.randomUUID(),
          filename: "boarding-pass.png",
          mimeType: "image/png",
          contentBytes: "",
          size: 512000,
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "trash",
      from: "Spammy <offers@spam.biz>",
      to: ["you@example.com"],
      subject: "You won a prize!!!",
      preview: "Click here to claim",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5)),
      unread: false,
      bodyText: "Click suspicious link.",
      bodyHtml: "<p>Click <a href='#'>suspicious</a> link.</p>",
      headers: { "Message-Id": `<${crypto.randomUUID()}@spam.biz>` },
      attachments: [],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "inbox",
      from: "Uber <receipts@uber.com>",
      to: ["you@example.com"],
      subject: "Your Uber Trip Tue 8 PM",
      preview: "Thanks for riding with Uber",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 32)),
      unread: false,
      bodyText: "Trip receipt attached.",
      bodyHtml: "<p>Trip receipt attached.</p>",
      headers: { "Message-Id": `<${crypto.randomUUID()}@uber.com>` },
      attachments: [],
    },
    {
      id: crypto.randomUUID(),
      mailboxId: defaultMailbox.id,
      folderId: "inbox",
      from: "Amazon <auto-confirm@amazon.com>",
      to: ["you@example.com"],
      subject: "Your order has shipped",
      preview: "Order #123-456 tracking info inside",
      receivedDateTime: iso(new Date(now.getTime() - 1000 * 60 * 60 * 12)),
      unread: true,
      bodyText: "Your order has shipped.",
      bodyHtml: "<p>Your order has shipped.</p>",
      headers: { "Message-Id": `<${crypto.randomUUID()}@amazon.com>` },
      attachments: [],
    },
  ];

  const map: Record<string, EmailMessage> = {};
  for (const m of messages) map[m.id] = m;

  return { mailboxes: [defaultMailbox], messages: map };
}

const DB: MailDB = globalAny[GLOBAL_KEY] ?? createInitialDB();
globalAny[GLOBAL_KEY] = DB;

export function getMailboxes(): Mailbox[] {
  return DB.mailboxes;
}

export function listEmails(params: {
  mailboxId?: string;
  folderId?: string;
  query?: string;
  from?: string;
  unreadOnly?: boolean;
  limit?: number;
  orderBy?: EmailOrderBy;
}): EmailSummary[] {
  const {
    mailboxId = DB.mailboxes[0]?.id,
    folderId = "inbox",
    query,
    from,
    unreadOnly,
    limit = 50,
    orderBy = "receivedDateTime",
  } = params;

  let arr = Object.values(DB.messages).filter(
    (m) => m.mailboxId === mailboxId && (!folderId || m.folderId === folderId)
  );

  if (typeof unreadOnly === "boolean") {
    arr = arr.filter((m) => (unreadOnly ? m.unread : true));
  }
  if (from) arr = arr.filter((m) => m.from.toLowerCase().includes(from.toLowerCase()));
  if (query) {
    const q = query.toLowerCase();
    arr = arr.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q)
    );
  }

  arr.sort((a, b) => {
    if (orderBy === "subject") return a.subject.localeCompare(b.subject);
    return b.receivedDateTime.localeCompare(a.receivedDateTime);
  });

  const summaries: EmailSummary[] = arr.slice(0, limit).map((m) => ({
    id: m.id,
    mailboxId: m.mailboxId,
    folderId: m.folderId,
    from: m.from,
    to: m.to,
    subject: m.subject,
    preview: m.preview,
    receivedDateTime: m.receivedDateTime,
    unread: m.unread,
    hasAttachments: Boolean(m.attachments && m.attachments.length > 0),
  }));

  return summaries;
}

export function searchEmails(params: {
  mailboxId?: string;
  query: string;
  from?: string;
  to?: string;
  subjectContains?: string;
  since?: string;
  until?: string;
  limit?: number;
}): EmailSummary[] {
  const {
    mailboxId = DB.mailboxes[0]?.id,
    query,
    from,
    to,
    subjectContains,
    since,
    until,
    limit = 50,
  } = params;

  const q = query?.toLowerCase?.() ?? "";
  const sinceMs = since ? Date.parse(since) : undefined;
  const untilMs = until ? Date.parse(until) : undefined;

  let arr = Object.values(DB.messages).filter((m) => m.mailboxId === mailboxId);

  if (from) arr = arr.filter((m) => m.from.toLowerCase().includes(from.toLowerCase()));
  if (to) arr = arr.filter((m) => m.to.join(",").toLowerCase().includes(to.toLowerCase()));
  if (subjectContains)
    arr = arr.filter((m) => m.subject.toLowerCase().includes(subjectContains.toLowerCase()));
  if (sinceMs) arr = arr.filter((m) => Date.parse(m.receivedDateTime) >= sinceMs);
  if (untilMs) arr = arr.filter((m) => Date.parse(m.receivedDateTime) <= untilMs);

  if (q) {
    arr = arr.filter((m) => {
      const hay = [m.subject, m.preview, m.from, m.to.join(" "), m.bodyText ?? "", m.bodyHtml ?? ""]
        .join("\n")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  arr.sort((a, b) => b.receivedDateTime.localeCompare(a.receivedDateTime));

  return arr.slice(0, limit).map((m) => ({
    id: m.id,
    mailboxId: m.mailboxId,
    folderId: m.folderId,
    from: m.from,
    to: m.to,
    subject: m.subject,
    preview: m.preview,
    receivedDateTime: m.receivedDateTime,
    unread: m.unread,
    hasAttachments: Boolean(m.attachments && m.attachments.length > 0),
  }));
}

export function readEmail(params: {
  messageId: string;
  mailboxId?: string;
  format?: "html" | "text";
}): EmailMessage | undefined {
  const { messageId } = params;
  const msg = DB.messages[messageId];
  if (!msg) return undefined;
  // Mark as read on open
  msg.unread = false;
  return { ...msg };
}

export function sendEmail(params: {
  mailboxId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  format?: "html" | "text";
  attachments?: Array<{ filename: string; contentBytes: string; mimeType?: string }>;
}): { id: string; success: boolean } {
  const {
    mailboxId = DB.mailboxes[0]?.id,
    to,
    cc,
    bcc,
    subject,
    body,
    format = "text",
    attachments = [],
  } = params;

  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const att: EmailAttachment[] = attachments.map((a) => ({
    id: crypto.randomUUID(),
    filename: a.filename,
    mimeType: a.mimeType,
    contentBytes: a.contentBytes,
  }));

  const message: EmailMessage = {
    id,
    mailboxId,
    folderId: "sent",
    from: "you@example.com",
    to,
    cc,
    bcc,
    subject,
    preview: (body ?? "").slice(0, 120),
    receivedDateTime: nowIso,
    unread: false,
    bodyText: format === "text" ? body : undefined,
    bodyHtml: format === "html" ? body : undefined,
    headers: {
      "Message-Id": `<${crypto.randomUUID()}@oasis.local>`,
      Date: nowIso,
    },
    attachments: att,
  };

  DB.messages[id] = message;
  return { id, success: true };
}
