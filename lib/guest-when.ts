import type { Trip } from "@/lib/party-types";
import { settledTimeZone } from "@/lib/timezones";

export function formatClockTime(value: string): string {
  const trimmed = value.trim();
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) return trimmed;
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

export function formatWeekdayDate(isoDate: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return undefined;
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function shortTimeZoneName(timeZone: string, at = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(at);
    return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/** Human when-line for guests. No timezone → clock time stays TBD; never guess a zone. */
export function formatGuestWhen(trip: Trip): string | undefined {
  if (!trip.startDate) return undefined;
  const start = formatWeekdayDate(trip.startDate);
  if (!start) return undefined;
  const end =
    trip.endDate && trip.endDate !== trip.startDate
      ? formatWeekdayDate(trip.endDate)
      : undefined;
  const range = end ? `${start} – ${end}` : start;
  const zone = settledTimeZone(trip.timezone);
  const clock = trip.startTime?.trim();
  if (clock && !zone) return `${range} · time TBD`;
  if (clock && zone) {
    return `${range}, ${formatClockTime(clock)} ${shortTimeZoneName(zone)}`;
  }
  return range;
}

export function formatGuestWhere(trip: Trip): {
  place?: string;
  address?: string;
  mapsUrl?: string;
} {
  return {
    ...(trip.location ? { place: trip.location } : {}),
    ...(trip.address ? { address: trip.address } : {}),
    ...(trip.mapsUrl ? { mapsUrl: trip.mapsUrl } : {}),
  };
}
