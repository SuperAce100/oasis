"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();

  type Stage = "idle" | "contentFade" | "overlayFade";
  const [stage, setStage] = useState<Stage>("idle");
  const [hasStarted, setHasStarted] = useState(false);

  const handleGetStarted = () => {
    if (hasStarted) return;
    setHasStarted(true);
    setStage("contentFade");

    // After content fades, fade the overlay, then navigate
    const overlayTimer = setTimeout(() => setStage("overlayFade"), 800);
    const navTimer = setTimeout(() => router.push("/os"), 2000);

    // Cleanup if component unmounts
    return () => {
      clearTimeout(overlayTimer);
      clearTimeout(navTimer);
    };
  };

  const contentOpacityClass = useMemo(
    () => (stage === "idle" ? "opacity-100" : "opacity-0"),
    [stage]
  );

  const overlayOpacityClass = useMemo(
    () => (stage === "overlayFade" ? "opacity-0" : "opacity-100"),
    [stage]
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/background.jpg')] bg-cover bg-center -z-20" />

      {/* Dark overlay that will fade out */}
      <div
        className={
          "absolute inset-0 bg-black/50 transition-opacity duration-700 ease-out -z-10 " +
          overlayOpacityClass
        }
      />

      {/* Foreground content */}
      <div
        className={
          "relative z-10 flex h-full w-full flex-col items-center justify-center text-white transition-opacity duration-500 ease-out " +
          contentOpacityClass
        }
      >
        <h1 className="text-8xl font-bold tracking-tight">Oasis</h1>
        <p className="mt-2 text-4xl tracking-tight">The AI operating system.</p>
        <Button
          variant="fancy"
          className="mt-10 text-xl"
          onClick={handleGetStarted}
          disabled={hasStarted}
        >
          Get Started
        </Button>
      </div>
    </div>
  );
}
