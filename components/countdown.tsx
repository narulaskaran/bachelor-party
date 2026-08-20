"use client";

/**
 * Days remaining until `startDate` (an ISO date string, e.g. "2026-09-04").
 * Depends on the visitor's local clock, so the server-rendered guess and the
 * client's real value can differ by a day around midnight.
 * suppressHydrationWarning tells React that mismatch is expected here rather
 * than a bug. Far-future dates render nothing so the page doesn't look broken.
 */
import { countdownLabel } from "@/lib/countdown";

export function Countdown({ startDate, timeZone }: { startDate: string; timeZone?: string }) {
  const label = countdownLabel(startDate, new Date(), timeZone);
  if (!label) return null;

  return (
    <p
      suppressHydrationWarning
      className="text-sm text-muted-foreground"
    >
      {label}
    </p>
  );
}
