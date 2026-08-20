import type { GuestUpdate, PartyContent, ScheduleDay } from "@/lib/party-types";

type CriticalField = {
  label: string;
  value: (content: PartyContent) => string;
};

const CRITICAL_FIELDS: CriticalField[] = [
  { label: "When", value: (content) => [content.trip.startDate, content.trip.endDate].filter(Boolean).join("–") },
  { label: "Where", value: (content) => content.trip.location ?? "" },
  { label: "Time zone", value: (content) => content.trip.timezone ?? "" },
  { label: "Lodging", value: (content) => content.lodging?.name ?? "" },
  { label: "Address", value: (content) => content.lodging?.address ?? "" },
  { label: "Schedule", value: (content) => scheduleFingerprint(content.schedule) },
];

function scheduleFingerprint(schedule: ScheduleDay[] | undefined): string {
  if (!schedule?.length) return "";
  return schedule
    .map((day) =>
      [day.date, day.timed ? "timed" : "loose", ...day.entries.map((entry) => `${entry.time ?? ""}|${entry.title}`)].join("~"),
    )
    .join("/");
}

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

export function guestUpdateLabel(update: GuestUpdate): string {
  const when = formatGuestUpdateAt(update.at);
  const fields = update.fields.join(", ");
  return when ? `Updated ${when} — ${fields}` : `Updated — ${fields}`;
}

function formatGuestUpdateAt(iso: string): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
