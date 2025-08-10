"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import type { EmailAttachment } from "./types";

export function AttachmentPill({ attachment }: { attachment: EmailAttachment }) {
  const handleDownload = React.useCallback(() => {
    if (!attachment.contentBytes) {
      toast.info("Attachment placeholder only in demo");
      return;
    }
    try {
      const byteCharacters = atob(attachment.contentBytes);
      const byteNumbers = new Array(byteCharacters.length)
        .fill(0)
        .map((_, i) => byteCharacters.charCodeAt(i));
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: attachment.mimeType ?? "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Failed to download attachment");
    }
  }, [attachment]);

  return (
    <Badge variant="outline" className="cursor-pointer" onClick={handleDownload}>
      <Paperclip className="mr-1 size-3" /> {attachment.filename}
    </Badge>
  );
}
