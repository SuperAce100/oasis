import * as React from "react";
import { postJSON } from "./utils";
import type { EmailSummary, EmailMessage, OrderBy } from "./types";

export function useEmailList(params: {
  folderId: string;
  unreadOnly: boolean;
  orderBy: OrderBy;
  query: string;
}) {
  const { folderId, unreadOnly, orderBy, query } = params;
  const [emails, setEmails] = React.useState<EmailSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (query.trim().length > 0) {
        const data = await postJSON<{ messages: EmailSummary[] }>("/api/mail/search", {
          query,
          limit: 100,
        });
        setEmails(data.messages || []);
      } else {
        const data = await postJSON<{ messages: EmailSummary[] }>("/api/mail/list", {
          folderId,
          unreadOnly,
          orderBy,
          limit: 100,
        });
        setEmails(data.messages || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [folderId, unreadOnly, orderBy, query]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { emails, isLoading, error, refresh };
}

export function useEmailRead(messageId: string | null) {
  const [message, setMessage] = React.useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!messageId) {
      setMessage(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await postJSON<{ message: EmailMessage }>("/api/mail/read", { messageId });
        if (!cancelled) setMessage(data.message);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  return { message, isLoading, error };
}

export function useGmailStatus() {
  const [isGmailConnected, setIsGmailConnected] = React.useState<boolean>(false);
  const [isChecking, setIsChecking] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Test Gmail connection by trying to list emails
        const result = await postJSON<{ error?: string }>("/api/mcp", {
          action: "call",
          name: "list_email",
          arguments: { limit: 1 },
        });

        if (!cancelled) {
          // If we get a response without credentials error, Gmail is connected
          setIsGmailConnected(
            !result.error || !result.error.includes("credentials not configured")
          );
        }
      } catch (e) {
        if (!cancelled) {
          setIsGmailConnected(false);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isGmailConnected, isChecking };
}
