"use client";

/**
 * Days remaining until `startDate` (an ISO date string, e.g. "2026-09-04"),
 * rendered as "T-minus N days". Depends on the visitor's local clock, so the
 * server-rendered guess and the client's real value can differ by a day
 * around midnight. suppressHydrationWarning tells React that mismatch is
 * expected here rather than a bug.
 */
export function Countdown({ startDate }: { startDate: string }) {
  const target = new Date(`${startDate}T00:00:00`);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.round((target.getTime() - startOfToday.getTime()) / msPerDay);

  const label =
    daysLeft > 0
      ? `T-minus ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
      : daysLeft === 0
        ? "Today's the day"
        : "In the books";

  return (
    <p
      suppressHydrationWarning
      className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
    >
      {label}
    </p>
  );
}
