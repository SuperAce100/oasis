export type OpenTerminalEvent = {
  command: string;
  cwd?: string;
};

export type OpenMailEvent = {
  messageId: string;
};

const OPEN_TERMINAL_EVENT = "oasis:open-terminal" as const;
const OPEN_MAIL_EVENT = "oasis:open-mail" as const;

type Listener<T> = (detail: T) => void;

export function openTerminal(detail: OpenTerminalEvent) {
  if (typeof window === "undefined") return;
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

export function openMail(detail: OpenMailEvent) {
  if (typeof window === "undefined") return;
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