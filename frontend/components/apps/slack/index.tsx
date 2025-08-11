"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useBackend } from "@/hooks/use-backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type SlackChannel = {
  id: string;
  name: string;
  is_member?: boolean;
  is_private?: boolean;
};

export type SlackAppProps = React.HTMLAttributes<HTMLDivElement>;

export function SlackApp({ className, ...props }: SlackAppProps) {
  const { callTool } = useBackend();
  const [teamName, setTeamName] = React.useState<string>("");
  const [teamIdState, setTeamIdState] = React.useState<string>("");
  const [messages, setMessages] = React.useState<any[]>([]);
  const [historyNote, setHistoryNote] = React.useState<string>("");
  const historyEndRef = React.useRef<HTMLDivElement | null>(null);
  const [channels, setChannels] = React.useState<SlackChannel[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [selected, setSelected] = React.useState<SlackChannel | null>(null);
  const [postText, setPostText] = React.useState<string>("");
  const [posting, setPosting] = React.useState<boolean>(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // Fetch team/app identity
        try {
          const info = await callTool<any>("slack_auth_test", {});
          const name = info?.team || info?.result?.team || "";
          const tid = info?.team_id || info?.result?.team_id || "";
          setTeamName(name);
          setTeamIdState(tid);
        } catch {}
        // List channels (public by default). Add more types if needed.
        const res = await callTool<any>("slack_list_conversations", { limit: 200 });
        let list = (res?.channels ?? res?.result?.channels ?? []) as SlackChannel[];
        if (Array.isArray(list) && teamIdState) {
          list = (list as any[]).filter((c) => c?.context_team_id === teamIdState);
        }
        if (!cancelled) {
          setChannels(list);
          // Prefer general or first member channel
          const preferred =
            list.find((c) => c.name === "general" && c.is_member) ||
            list.find((c) => c.is_member) ||
            list[0] ||
            null;
          setSelected(preferred ?? null);
        }
      } catch (e) {
        // silently ignore for demo
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [callTool]);

  async function onSend() {
    const text = postText.trim();
    if (!text || !selected) return;
    try {
      setPosting(true);
      await callTool("slack_post_message", { channel: selected.id, text });
      setPostText("");
    } catch {
      // ignore for demo
    } finally {
      setPosting(false);
    }
  }

  const teamId = process.env.NEXT_PUBLIC_SLACK_TEAM_ID || teamIdState;
  // Note: Slack generally blocks embedding with X-Frame-Options; this preview may not render inside an iframe.
  const iframeUrl = selected && teamId ? `https://app.slack.com/client/${teamId}/${selected.id}` : null;

  // Fetch history for selected channel (if permitted by scopes)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selected) {
        setMessages([]);
        setHistoryNote("");
        return;
      }
      try {
        const res = await callTool<any>("slack_get_history", { channel: selected.id, limit: 30 });
        const msgs = (res?.messages ?? res?.result?.messages ?? []) as any[];
        if (!cancelled) {
          setMessages(msgs);
          setHistoryNote("");
        }
      } catch (e: any) {
        const msg = e?.message || "";
        if (!cancelled) {
          if (msg.includes("missing_scope")) {
            setHistoryNote("Missing scopes for history (e.g., channels:history). Messages hidden.");
          } else if (msg.includes("not_in_channel")) {
            setHistoryNote("Bot is not a member of this channel. Join or invite the bot to see history.");
          } else {
            setHistoryNote("Unable to load history.");
          }
          setMessages([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [callTool, selected?.id]);

  // Keep history scrolled to bottom when messages change
  React.useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, historyNote]);

  return (
    <div className={cn("w-full h-full", className)} {...props}>
      <div className="grid grid-cols-12 gap-3 h-full bg-background">
        {/* Sidebar */}
        <aside className="col-span-4 min-w-[260px] border-r p-2 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Channels</div>
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="space-y-1">
            {channels.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={cn(
                  "w-full text-left px-2 py-1 rounded-md hover:bg-muted",
                  selected?.id === c.id && "bg-muted"
                )}
              >
                <span className="font-medium">#{c.name}</span>
                {c.is_private ? <span className="ml-2 text-xs text-muted-foreground">(private)</span> : null}
              </button>
            ))}
            {channels.length === 0 && !loading && (
              <div className="text-sm text-muted-foreground">No channels</div>
            )}
          </div>
        </aside>

        {/* Main */}
        <section className="col-span-8 flex flex-col overflow-hidden">
          <div className="p-2 border-b flex items-center gap-2">
            <div className="text-sm text-muted-foreground mr-2">{teamName ? `Workspace: ${teamName}` : ''}</div>
            <Input
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder={selected ? `Message #${selected.name}` : "Select a channel"}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
              disabled={!selected || posting}
            />
            <Button onClick={onSend} disabled={!selected || posting}>
              {posting ? <Loader2 className="size-4 animate-spin" /> : "Send"}
            </Button>
          </div>

          {/* Iframe preview of Slack web (Slack may block iframes). */}
          <div className="flex-1 relative bg-muted/20">
            {iframeUrl ? (
              <iframe
                key={iframeUrl}
                src={iframeUrl}
                className="absolute inset-0 w-full h-full border-0"
                allow="clipboard-write;"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-center text-muted-foreground p-6">
                <div>
                  <div className="font-medium mb-2">Slack preview unavailable</div>
                  <div className="text-sm">Set NEXT_PUBLIC_SLACK_TEAM_ID or open Slack in a new tab. Slack may block embedding via X-Frame-Options.</div>
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 max-h-60 overflow-auto bg-background/90 border-t">
              {historyNote ? (
                <div className="p-2 text-xs text-muted-foreground">{historyNote}</div>
              ) : messages.length > 0 ? (
                <div className="p-2 space-y-1 text-sm">
                  {([...messages].reverse()).map((m, i) => (
                    <div key={m.ts ?? i} className="truncate">
                      <span className="text-muted-foreground text-xs mr-2">{m.user || m.username || "bot"}</span>
                      <span>{m.text}</span>
                    </div>
                  ))}
                  <div ref={historyEndRef} />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SlackApp;

