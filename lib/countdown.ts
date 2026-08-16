const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Hide the countdown when the trip is more than a year out. */
export const COUNTDOWN_HIDE_AFTER_DAYS = 365;

export function daysUntil(startDate: string, now = new Date()): number {
  const target = new Date(`${startDate}T00:00:00`);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

/**
 * Plain-language countdown. Returns null when the date is so far out that
 * "1476 days to go" would look broken.
 */
export function countdownLabel(startDate: string, now = new Date()): string | null {
  const daysLeft = daysUntil(startDate, now);
  if (daysLeft > COUNTDOWN_HIDE_AFTER_DAYS) return null;
  if (daysLeft >= 3) {
    return `${daysLeft} days to go`;
  }
  if (daysLeft >= 0) return "This weekend";
  return "In the books";
}
