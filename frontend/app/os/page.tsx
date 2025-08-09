
import { TopBar } from "@/components/os/top-bar";
import { Dock } from "@/components/os/dock";
import { Desktop } from "@/components/os/desktop";
import { Window, WindowContainer } from "@/components/os/window";

export default function OS() {
  return (
    <main className="relative min-h-screen bg-background">
      <TopBar />
      <WindowContainer className="absolute inset-0">
        <Desktop>
          <Window title="Welcome" initialX={32} initialY={32} initialWidth={420} initialHeight={260}>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p>Welcome to Oasis OS. Drag, resize, minimize, and maximize windows.</p>
            </div>
          </Window>
        </Desktop>
      </WindowContainer>
      <Dock
        items={[
          { id: "files", label: "Files", iconSrc: "/file.svg" },
          { id: "globe", label: "Browser", iconSrc: "/globe.svg" },
          { id: "next", label: "Next.js", iconSrc: "/next.svg" },
          { id: "vercel", label: "Vercel", iconSrc: "/vercel.svg" },
        ]}
      />
    </main>
  );
}