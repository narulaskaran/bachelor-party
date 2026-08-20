import type { GuestUpdate, PartyContent } from "@/lib/party-types";

type CriticalField = {
  label: string;
  value: (content: PartyContent) => string;
};

const CRITICAL_FIELDS: CriticalField[] = [
  {
    label: "When",
    value: (content) =>
      [content.trip.startDate, content.trip.endDate, content.trip.startTime, content.trip.timezone]
        .filter(Boolean)
        .join("|"),
  },
  {
    label: "Where",
    value: (content) => [content.trip.location, content.trip.address].filter(Boolean).join("|"),
  },
  {
    label: "What",
    value: (content) => [content.trip.siteName, content.trip.tagline].filter(Boolean).join("|"),
  },
];

export function criticalGuestChanges(previous: PartyContent, next: PartyContent): string[] {
  return CRITICAL_FIELDS.filter((field) => field.value(previous) !== field.value(next)).map(
    (field) => field.label,
  );
}

/** After a published event changes a guest-visible logistic, mark the page updated. */
export function guestUpdateForPublish(
  previousPublished: PartyContent,
  next: PartyContent,
  wasPublished: boolean,
  now = new Date(),
): GuestUpdate | undefined {
  if (!wasPublished) return undefined;
  const fields = criticalGuestChanges(previousPublished, next);
  if (!fields.length) return previousPublished.guestUpdate;
  return { at: now.toISOString(), fields };
}

export function guestUpdateRelativeLabel(update: GuestUpdate, now = new Date()): string {
  const at = new Date(update.at);
  if (Number.isNaN(at.getTime())) return "Updated";
  return `Updated ${formatRelativeTime(at, now)}`;
}

export function guestUpdateLabel(update: GuestUpdate, now = new Date()): string {
  return guestUpdateRelativeLabel(update, now);
}

function formatRelativeTime(at: Date, now: Date): string {
  const diffMs = now.getTime() - at.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
