"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { EmailMessage } from "./types";
import { formatRelative } from "./utils";

export function MessageView({ message }: { message: EmailMessage }) {
  return (
    <div className="h-full flex flex-col">
      <header className="border-b p-4">
        <div className="text-xs text-muted-foreground">From: {message.from}</div>
        <h2 className="text-lg font-semibold">{message.subject}</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">To: {message.to.join(", ")}</Badge>
          {message.cc && message.cc.length > 0 && (
            <Badge variant="outline">Cc: {message.cc.join(", ")}</Badge>
          )}
          <Badge variant="outline">{formatRelative(message.receivedDateTime)}</Badge>
          {message.unread === false && <Badge variant="secondary">Read</Badge>}
        </div>
      </header>
      <article className="prose prose-sm dark:prose-invert max-w-none p-4 overflow-auto">
        {message.bodyHtml ? (
          <div dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />
        ) : (
          <pre className="whitespace-pre-wrap text-sm">{message.bodyText ?? message.preview}</pre>
        )}
      </article>
    </div>
  );
}
