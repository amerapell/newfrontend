"use client";
import { clockText, useCountdown } from "@/components/ui/Countdown";

/** "Opens in 02:14:32" (upcoming drop hero panel). */
export function HeroCountdown({ target }: { target: string }) {
  const secs = useCountdown(target);
  if (secs === 0) return null;
  return (
    <p className="hero__clock tnum" role="timer" aria-live="off" suppressHydrationWarning>
      Opens in {clockText(secs)}
    </p>
  );
}
