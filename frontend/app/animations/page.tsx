"use client";

import Logo from "@/components/logo";
import Reveal from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function AnimationsPage() {
  const router = useRouter();

  type Stage = "idle" | "contentFade" | "overlayFade";
  const [stage, setStage] = useState<Stage>("idle");
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = () => {
    if (hasStarted) return;
    setHasStarted(true);
    setStage("contentFade");

    const overlayTimer = setTimeout(() => setStage("overlayFade"), 1000);
    const navTimer = setTimeout(() => router.push("/os"), 1500);

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
    <div className="relative flex h-full w-full items-center justify-center text-white">
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/background2.jpg')] bg-cover bg-center -z-20" />

      {/* Dark overlay that will fade out */}
      <div
        className={
          "absolute inset-0 bg-black/30 transition-opacity duration-1000 -z-10 " +
          overlayOpacityClass
        }
      />

      {/* Foreground content */}
      <div
        className={
          "relative z-10 flex h-full w-full flex-col items-center justify-center scale-200 transition-opacity duration-1000 " +
          contentOpacityClass
        }
      >
        <Reveal index={0}>
          <Logo className="w-32 h-32" />
        </Reveal>
        <Reveal index={1}>
          <h1 className="text-8xl font-bold tracking-tight">Oasis</h1>
        </Reveal>
        <Reveal index={2}>
          <p className="text-2xl tracking-tight">The AI operating system</p>
        </Reveal>
        <Reveal index={3}>
          <Button
            variant="fancy"
            className="bg-cyan-200 text-xl tracking-tight mt-8 group"
            style={
              {
                "--primary": "var(--color-rose-400)",
              } as React.CSSProperties
            }
            onClick={handleStart}
            disabled={hasStarted}
          >
            Log in
          </Button>
        </Reveal>
      </div>
    </div>
  );
}
