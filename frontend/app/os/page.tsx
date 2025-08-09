"use client";

import * as React from "react";
import { TopBar } from "@/components/os/top-bar";
import { Dock } from "@/components/os/dock";
import { Desktop } from "@/components/os/desktop";
import { Window } from "@/components/os/window";
import { TerminalApp } from "@/components/apps/terminal";
import { CalendarApp } from "@/components/apps/calendar";
import { MailApp } from "@/components/apps/mail";

export default function OS() {
  const [isTerminalOpen, setIsTerminalOpen] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isMailOpen, setIsMailOpen] = React.useState(false);

  return (
    <main className="relative min-h-screen bg-background">
      <TopBar />
      <Desktop>
        <Window title="Welcome" initialX={32} initialY={32} initialWidth={420} initialHeight={260}>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>Welcome to Oasis OS. Drag, resize, minimize, and maximize windows.</p>
          </div>
        </Window>

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

        {isCalendarOpen && (
          <Window
            title="Calendar"
            initialX={160}
            initialY={64}
            initialWidth={380}
            initialHeight={360}
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
            initialWidth={800}
            initialHeight={600}
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
    </main>
  );
}
