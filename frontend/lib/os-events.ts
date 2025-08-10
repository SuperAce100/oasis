export type OpenTerminalEvent = {
  command: string;
  cwd?: string;
};

export type OpenFilesEvent = {
  path?: string; // absolute or relative to allowed roots
};

// Discriminated union for Mail deeplinks covering all major actions
export type OpenMailEvent =
  | { action: "read"; messageId: string }
  | { action: "search"; query: string }
  | {
      action: "list";
      folderId?: string; // inbox | sent | archive | trash
      unreadOnly?: boolean;
      orderBy?: "receivedDateTime" | "subject";
      query?: string; // clear or preset query
    }
  | {
      action: "compose";
      to?: string[];
      cc?: string[];
      bcc?: string[];
      subject?: string;
      body?: string;
      format?: "text" | "html";
    };

const OPEN_TERMINAL_EVENT = "oasis:open-terminal" as const;
const OPEN_MAIL_EVENT = "oasis:open-mail" as const;
const OPEN_FILES_EVENT = "oasis:open-files" as const;

type Listener<T> = (detail: T) => void;

export function openTerminal(detail: OpenTerminalEvent) {
  if (typeof window === "undefined") return;
  console.log("[os-events] Dispatching openTerminal event:", detail);
  window.dispatchEvent(new CustomEvent(OPEN_TERMINAL_EVENT, { detail }));
}

export function onOpenTerminal(listener: Listener<OpenTerminalEvent>) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<OpenTerminalEvent>;
    listener(ce.detail);
  };
  window.addEventListener(OPEN_TERMINAL_EVENT, handler as EventListener);
  return () => window.removeEventListener(OPEN_TERMINAL_EVENT, handler as EventListener);
}

export function openFiles(detail: OpenFilesEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_FILES_EVENT, { detail }));
}

export function onOpenFiles(listener: Listener<OpenFilesEvent>) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<OpenFilesEvent>;
    listener(ce.detail);
  };
  window.addEventListener(OPEN_FILES_EVENT, handler as EventListener);
  return () => window.removeEventListener(OPEN_FILES_EVENT, handler as EventListener);
}

export function openMail(detail: OpenMailEvent) {
  if (typeof window === "undefined") return;
  // Debug: log mail deeplink dispatch
  try {
    // eslint-disable-next-line no-console
    console.debug("[oasis] openMail dispatch", detail);
  } catch {}
  window.dispatchEvent(new CustomEvent(OPEN_MAIL_EVENT, { detail }));
}

export function onOpenMail(listener: Listener<OpenMailEvent>) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<OpenMailEvent>;
    listener(ce.detail);
  };
  window.addEventListener(OPEN_MAIL_EVENT, handler as EventListener);
  return () => window.removeEventListener(OPEN_MAIL_EVENT, handler as EventListener);
}
