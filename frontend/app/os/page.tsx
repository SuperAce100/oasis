"use client";

import * as React from "react";
import { TopBar } from "@/components/os/top-bar";
import { Dock } from "@/components/os/dock";
import { Desktop } from "@/components/os/desktop";
import { Window } from "@/components/os/window";
import { TerminalApp } from "@/components/apps/terminal";
import { CalendarApp } from "@/components/apps/calendar";
import { MailApp } from "@/components/apps/mail";
import { FilesApp } from "@/components/apps/files";
import { AgentApp } from "@/components/apps/agent";
import Logo from "@/components/logo";
import AgentPrompt from "@/components/apps/agent/prompt";
import { Button } from "@/components/ui/button";

export default function OS() {
  const [isTerminalOpen, setIsTerminalOpen] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isMailOpen, setIsMailOpen] = React.useState(false);
  const [isFilesOpen, setIsFilesOpen] = React.useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = React.useState(true);
  // Agent overlay state
  const [isAgentVisible, setIsAgentVisible] = React.useState(false);
  const [agentPhase, setAgentPhase] = React.useState<"prompt" | "running">("prompt");
  const [agentInput, setAgentInput] = React.useState("");
  const [agentQuery, setAgentQuery] = React.useState("");

  // Global Cmd+K handler
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isTyping =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);
      if (isTyping) return;

      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setAgentInput("");
        setAgentPhase("prompt");
        setIsAgentVisible(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="relative min-h-screen bg-background">
      <TopBar />
      <Desktop>
        {isWelcomeOpen && (
          <Window
            className={
              "animate-in fade-in-0 duration-1000" + (isWelcomeOpen ? "" : "hidden animate-out")
            }
            title="Welcome"
            initialX={typeof window !== "undefined" ? window.innerWidth / 2 - 225 : 100}
            initialY={typeof window !== "undefined" ? window.innerHeight / 2 - 225 : 100}
            initialWidth={450}
            initialHeight={450}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none flex flex-col items-center justify-center h-full bg-gradient-to-b from-white/40 to-primary/30 via-transparent text-stone-800">
              <Logo className="w-32 h-32" />
              <h1 className="text-9xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-transparent">
                Oasis
              </h1>
              <p className="text-2xl text-balance text-muted-foreground">
                The AI native operating system.
              </p>
              <Button
                variant="fancy"
                className="mt-4"
                onClick={() => {
                  setIsWelcomeOpen(false);
                  setIsAgentVisible(true);
                  setAgentPhase("prompt");
                }}
              >
                Get started
              </Button>
            </div>
          </Window>
        )}

        {isTerminalOpen && (
          <Window
            title="Terminal"
            initialX={80}
            initialY={96}
            initialWidth={560}
            initialHeight={360}
            onClose={() => setIsTerminalOpen(false)}
          >
            <TerminalApp className="h-full" />
          </Window>
        )}

        {isFilesOpen && (
          <Window
            title="Files"
            initialX={120}
            initialY={140}
            initialWidth={820}
            initialHeight={520}
            minWidth={640}
            minHeight={420}
            onClose={() => setIsFilesOpen(false)}
          >
            <FilesApp className="h-full" />
          </Window>
        )}

        {isCalendarOpen && (
          <Window
            title="Calendar"
            initialX={160}
            initialY={64}
            initialWidth={1280}
            initialHeight={720}
            minWidth={800}
            minHeight={600}
            onClose={() => setIsCalendarOpen(false)}
          >
            <CalendarApp />
          </Window>
        )}

        {isMailOpen && (
          <Window
            title="Mail"
            initialX={220}
            initialY={120}
            initialWidth={1280}
            initialHeight={720}
            minWidth={800}
            minHeight={600}
            onClose={() => setIsMailOpen(false)}
          >
            <MailApp className="h-full" />
          </Window>
        )}
      </Desktop>
      <Dock
        items={[
          {
            id: "files",
            label: "Files",
            iconSrc: "/apps/Files.png",
            onClick: () => setIsFilesOpen(true),
          },
          {
            id: "terminal",
            label: "Terminal",
            iconSrc: "/apps/Terminal.png",
            onClick: () => setIsTerminalOpen(true),
          },
          {
            id: "calendar",
            label: "Calendar",
            iconSrc: "/apps/Calendar.png",
            onClick: () => setIsCalendarOpen(true),
          },
          {
            id: "mail",
            label: "Mail",
            iconSrc: "/apps/Mail.png",
            onClick: () => setIsMailOpen(true),
          },
          { id: "notion", label: "Notion", iconSrc: "/apps/Notion.png" },
          { id: "slack", label: "Slack", iconSrc: "/apps/Slack.png" },
          { id: "spotify", label: "Spotify", iconSrc: "/apps/Spotify.png" },
        ]}
      />

      {/* Agent prompt + panel overlay */}
      {isAgentVisible && (
        <div className="pointer-events-none fixed inset-0 z-[900]">
          {/* Scrim only during prompt phase to block background */}
          {agentPhase === "prompt" && (
            <div
              className="pointer-events-auto absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => {
                setIsAgentVisible(false);
              }}
            />
          )}

          {/* Shell that transitions from center to right dock */}
          <div
            className={
              "pointer-events-auto absolute transition-all duration-300 ease-out " +
              (agentPhase === "prompt"
                ? "left-1/2 top-1/2 h-auto w-[640px] -translate-x-1/2 -translate-y-1/2"
                : "right-4 top-16 bottom-16 w-[380px]")
            }
          >
            {agentPhase === "prompt" ? (
              <AgentPrompt
                value={agentInput}
                onChange={setAgentInput}
                onSubmit={(q) => {
                  setAgentQuery(q);
                  setAgentPhase("running");
                }}
                onCancel={() => setIsAgentVisible(false)}
              />
            ) : (
              <AgentApp
                query={agentQuery}
                className="h-full"
                onClose={() => setIsAgentVisible(false)}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
