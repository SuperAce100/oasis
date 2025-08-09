import { TopBar } from "@/components/os/top-bar";
import { Dock } from "@/components/os/dock";
import { Desktop } from "@/components/os/desktop";
import { Window } from "@/components/os/window";

export default function OS() {
  return (
    <main className="relative min-h-screen bg-background">
      <TopBar />
      <Desktop>
        <Window title="Welcome" initialX={32} initialY={32} initialWidth={420} initialHeight={260}>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>Welcome to Oasis OS. Drag, resize, minimize, and maximize windows.</p>
          </div>
        </Window>
      </Desktop>
      <Dock
        items={[
          { id: "terminal", label: "Terminal", iconSrc: "/apps/Terminal.png" },
          { id: "calendar", label: "Calendar", iconSrc: "/apps/Calendar.png" },
          { id: "mail", label: "Mail", iconSrc: "/apps/Mail.png" },
          { id: "notion", label: "Notion", iconSrc: "/apps/Notion.png" },
          { id: "slack", label: "Slack", iconSrc: "/apps/Slack.png" },
          { id: "spotify", label: "Spotify", iconSrc: "/apps/Spotify.png" },
        ]}
      />
    </main>
  );
}
