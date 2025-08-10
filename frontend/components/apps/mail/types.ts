export type OrderBy = "receivedDateTime" | "subject";

export type EmailSummary = {
  id: string;
  mailboxId: string;
  folderId: string;
  from: string;
  to: string[];
  subject: string;
  preview: string;
  receivedDateTime: string;
  unread: boolean;
  hasAttachments?: boolean;
};

export type EmailAttachment = {
  id: string;
  filename: string;
  mimeType?: string;
  contentBytes: string;
  size?: number;
};

export type EmailMessage = EmailSummary & {
  cc?: string[];
  bcc?: string[];
  bodyText?: string;
  bodyHtml?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
};
