/** IANA zones hosts can pick. Abbreviations like ET/PT are not settled logistics. */
export const EVENT_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "UTC",
  "Europe/London",
  "Europe/Paris",
] as const;

export type EventTimeZone = (typeof EVENT_TIMEZONES)[number];

export function isIanaTimeZone(value: string | undefined): boolean {
  const zone = value?.trim();
  if (!zone) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Keep only a real IANA zone. Abbreviations and free-text stay unset. */
export function settledTimeZone(value: string | undefined): string | undefined {
  const zone = value?.trim();
  if (!zone || !isIanaTimeZone(zone)) return undefined;
  return zone;
}

export function calendarDateInZone(now: Date, timeZone?: string): string {
  const zone = settledTimeZone(timeZone);
  if (!zone) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function formatTimeZoneLabel(zone: string): string {
  return zone.replaceAll("_", " ");
}
