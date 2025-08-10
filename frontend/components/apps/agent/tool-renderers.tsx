"use client";

import React from "react";
import { Terminal, Calendar, Mail, Github, Book, ListChecks, Hammer } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { CodeBlock } from "@/components/ui/code-block";
import { openMail, openTerminal } from "@/lib/os-events";

type GenericRecord = Record<string, unknown>;

export type RenderToolProps = {
  toolName: string;
  input?: GenericRecord;
  state?: unknown;
};

export function RenderTool({ toolName, input, state }: RenderToolProps) {
  switch (toolName) {
    case "execute_terminal":
      return <TerminalTool input={input} state={state} />;
    case "list_calendar":
    case "create_calendar":
    case "delete_calendar":
    case "cancel_calendar":
    case "accept_calendar":
    case "tentative_calendar":
    case "decline_calendar":
      return <CalendarTool toolName={toolName} input={input} state={state} />;
    case "list_email":
    case "search_email":
    case "read_email":
    case "send_email":
      return <MailTool toolName={toolName} input={input} state={state} />;
    case "create_github_issue":
      return <GitHubTool input={input} state={state} />;
    case "get_notion_page":
      return <NotionTool input={input} state={state} />;
    case "get_job_status":
    case "list_jobs":
      return <JobsTool toolName={toolName} input={input} state={state} />;
    default:
      return (
        <div className="inline-flex items-center gap-2 rounded-md border bg-white/60 px-2 py-1 text-xs">
          <Hammer className="size-4" />
          {toolName}
          {input ? <span className="text-stone-600">{formatArgs(input)}</span> : null}
        </div>
      );
  }
}

function TerminalTool({ input, state }: { input?: GenericRecord; state?: unknown }) {
  const command = typeof input?.command === "string" ? (input?.command as string) : undefined;
  const cwd = typeof input?.cwd === "string" ? (input?.cwd as string) : undefined;
  const openedRef = React.useRef(false);
  React.useEffect(() => {
    if (!openedRef.current && state === "streaming" && command) {
      openedRef.current = true;
      openTerminal({ command, cwd });
    }
  }, [state, command]);
  return (
    <div className="space-y-2">
      <div className="flex flex-row gap-2 items-center">
        <Terminal className="size-4" />
        <span className="font-medium text-md">
          {state === "streaming" ? "Running command" : "Ran command"}
        </span>
        {command ? (
          <button
            type="button"
            onClick={() => openTerminal({ command, cwd })}
            className="ml-auto text-xs underline text-blue-700"
          >
            Open in Terminal
          </button>
        ) : null}
      </div>
      {command ? (
        <CodeBlock
          variant="flat"
          language="bash"
          code={command}
          className="w-full overflow-hidden bg-foreground/5 text-xs"
        />
      ) : null}
    </div>
  );
}

function CalendarTool({
  toolName,
  input,
  state,
}: {
  toolName: string;
  input?: GenericRecord;
  state?: unknown;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-white/60 px-2 py-1 text-xs">
      <Calendar className="size-4" />
      <span className="font-medium">Calendar</span>
      <span className="text-stone-700">{humanize(toolName)}</span>
      {renderArgs(input)}
      {typeof state === "string" ? <span className="ml-1 text-stone-500">({state})</span> : null}
    </div>
  );
}

function MailTool({
  toolName,
  input,
  state,
}: {
  toolName: string;
  input?: GenericRecord;
  state?: unknown;
}) {
  const messageId = typeof input?.messageId === "string" ? (input?.messageId as string) : undefined;
  const openedRef = React.useRef(false);
  React.useEffect(() => {
    if (!openedRef.current && toolName === "read_email" && state === "done" && messageId) {
      openedRef.current = true;
      openMail({ messageId });
    }
  }, [toolName, state, messageId]);
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="mail-tool">
        <AccordionTrigger className="text-md opacity-70">
          <div className="flex items-center gap-2">
            <Mail className="size-4" />
            <span className="">{humanize(toolName)}</span>
            {messageId ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openMail({ messageId });
                }}
                className="ml-2 text-xs underline text-blue-700"
              >
                Open in Mail
              </button>
            ) : null}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pl-6 pt-1">{renderArgs(input)}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function GitHubTool({ input, state }: { input?: GenericRecord; state?: unknown }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-white/60 px-2 py-1 text-xs">
      <Github className="size-4" />
      <span className="font-medium">GitHub</span>
      {renderArgs(input)}
      {typeof state === "string" ? <span className="ml-1 text-stone-500">({state})</span> : null}
    </div>
  );
}

function NotionTool({ input, state }: { input?: GenericRecord; state?: unknown }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-white/60 px-2 py-1 text-xs">
      <Book className="size-4" />
      <span className="font-medium">Notion</span>
      {renderArgs(input)}
      {typeof state === "string" ? <span className="ml-1 text-stone-500">({state})</span> : null}
    </div>
  );
}

function JobsTool({
  toolName,
  input,
  state,
}: {
  toolName: string;
  input?: GenericRecord;
  state?: unknown;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-white/60 px-2 py-1 text-xs">
      <ListChecks className="size-4" />
      <span className="font-medium">Jobs</span>
      <span className="text-stone-700">{humanize(toolName)}</span>
      {renderArgs(input)}
      {typeof state === "string" ? <span className="ml-1 text-stone-500">({state})</span> : null}
    </div>
  );
}

function renderArgs(args?: GenericRecord) {
  if (!args) return null;
  const text = formatArgs(args);
  if (!text) return null;
  return <span className="text-stone-600">{text}</span>;
}

function formatArgs(args: GenericRecord): string | null {
  try {
    const entries = Object.entries(args).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return null;
    const preview = entries
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join(", ");
    const suffix = entries.length > 4 ? ` … +${entries.length - 4} more` : "";
    return preview + suffix;
  } catch {
    return null;
  }
}

function codeInline(text: string) {
  return <code className="rounded bg-stone-100 px-1 py-0.5">{text}</code>;
}

function humanize(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
