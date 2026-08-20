import { calendarDateInZone } from "@/lib/timezones";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Hide the countdown when the event is more than a year out. */
export const COUNTDOWN_HIDE_AFTER_DAYS = 365;

function parseIsoDate(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function daysUntil(startDate: string, now = new Date(), timeZone?: string): number {
  const target = parseIsoDate(startDate);
  const today = parseIsoDate(calendarDateInZone(now, timeZone));
  if (target == null || today == null) return Number.NaN;
  return Math.round((target - today) / MS_PER_DAY);
}

/**
 * Plain-language countdown in the event time zone when one is set.
 * Returns null when the date is so far out that "1476 days to go" would look broken.
 */
export function countdownLabel(startDate: string, now = new Date(), timeZone?: string): string | null {
  const daysLeft = daysUntil(startDate, now, timeZone);
  if (!Number.isFinite(daysLeft)) return null;
  if (daysLeft > COUNTDOWN_HIDE_AFTER_DAYS) return null;
  if (daysLeft >= 3) {
    return `${daysLeft} days to go`;
  }
  if (daysLeft >= 0) return "This weekend";
  return "In the books";
}
