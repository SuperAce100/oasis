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
        const data = await postJSON<EmailSummary[]>("/api/mail/search", {
          query,
          limit: 100,
        });
        setEmails(data);
      } else {
        const data = await postJSON<EmailSummary[]>("/api/mail/list", {
          folderId,
          unreadOnly,
          orderBy,
          limit: 100,
        });
        setEmails(data);
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
        const data = await postJSON<EmailMessage>("/api/mail/read", { messageId });
        if (!cancelled) setMessage(data);
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
