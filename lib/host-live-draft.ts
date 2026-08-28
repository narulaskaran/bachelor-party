import { rsvpForDraft } from "@/lib/draft-publish";
import { parseEventPreset, type EventPreset, type WeekendBlock } from "@/lib/event-preset";
import { formatDateLabel, isInvertedDateRange } from "@/lib/trip-dates";
import { draftFactsForContent } from "@/lib/plan-ingestion";
import { slugFromName } from "@/lib/slug";
import {
  packingFromRows,
  scheduleFromRows,
  type ActivityEditorRow,
  type PackEditorRow,
  type ScheduleEditorRow,
} from "@/lib/schedule-rows";
import { settledTimeZone } from "@/lib/timezones";
import { eventTitleOrFallback, type PartyContent } from "@/lib/party-types";

export type HostPreviewSource = "draft" | "guests";

export type HostLiveDraftInput = {
  content: PartyContent;
  preset: EventPreset;
  enabledBlocks: Record<WeekendBlock, boolean>;
  scheduleRows: ScheduleEditorRow[];
  packingRows: PackEditorRow[];
  activityRows: ActivityEditorRow[];
  reviewAcknowledged: boolean;
  mapsUrl: string;
  lodgingName: string;
  lodgingAddress: string;
  lodgingUrl: string;
  lodgingMapsUrl: string;
  rsvpHeading: string;
  rsvpDescription: string;
  plusOnes: "allowed" | "not-allowed";
  presentationStyle: "clean" | "editorial";
};

export function httpsOrUndefined(value: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    return new URL(value).protocol === "https:" ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

export function urlForSave(value: string, previous?: string): string | undefined {
  if (!value) return undefined;
  if (value === previous) {
    try {
      const protocol = new URL(value).protocol;
      if (protocol === "http:") return value;
    } catch {
      return undefined;
    }
  }
  return httpsOrUndefined(value);
}

function activitiesFromRows(
  rows: ActivityEditorRow[],
  previous: PartyContent["activities"],
): PartyContent["activities"] {
  const core = rows
    .map((row) => {
      const name = row.name.trim();
      if (!name) return null;
      const slug = slugFromName(name) || "activity";
      const description = row.note.trim();
      return { slug, name, ...(description ? { description } : {}) };
    })
    .filter((item): item is { slug: string; name: string; description?: string } => item !== null);
  return core.length ? { ...previous, core } : undefined;
}

function lodgingFromFields(
  input: HostLiveDraftInput,
  previous: PartyContent,
): { lodging?: PartyContent["lodging"]; error?: string } {
  const lodgingName = input.lodgingName.trim();
  if (!lodgingName) return { lodging: undefined };
  const lodgingUrlValue = input.lodgingUrl.trim();
  const lodgingMapsValue = input.lodgingMapsUrl.trim();
  const url = urlForSave(lodgingUrlValue, previous.lodging?.url);
  const lodgingMapsUrl = urlForSave(lodgingMapsValue, previous.lodging?.mapsUrl);
  if (lodgingUrlValue && !url) return { error: "Lodging URL must use HTTPS." };
  if (lodgingMapsValue && !lodgingMapsUrl) return { error: "Maps URL must use HTTPS." };
  return {
    lodging: {
      name: lodgingName,
      url,
      mapsUrl: lodgingMapsUrl,
      address: input.lodgingAddress.trim() || undefined,
    },
  };
}

export function buildHostDraft(
  input: HostLiveDraftInput,
): { ok: true; content: PartyContent } | { ok: false; error: string } {
  const { content, preset } = input;
  const startDate = content.trip.startDate?.trim() || "";
  const endDate = content.trip.endDate?.trim() || "";
  if (isInvertedDateRange(startDate, endDate)) {
    return { ok: false, error: "inverted-dates" };
  }

  let schedule = content.schedule;
  try {
    schedule = input.enabledBlocks.schedule ? scheduleFromRows(input.scheduleRows) : undefined;
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "Fix the schedule rows." };
  }

  const mapsUrlValue = input.mapsUrl.trim();
  const mapsUrl = urlForSave(mapsUrlValue, content.trip.mapsUrl);
  if (mapsUrlValue && !mapsUrl) {
    return { ok: false, error: "Maps URL must use HTTPS." };
  }

  const next: PartyContent = {
    ...content,
    kind: "trip",
    preset,
    trip: {
      ...content.trip,
      siteName: eventTitleOrFallback(content.trip.siteName),
      tagline: content.trip.tagline?.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      startTime: content.trip.startTime?.trim() || undefined,
      dateLabel: formatDateLabel(startDate, endDate),
      location: content.trip.location?.trim() || undefined,
      address: content.trip.address?.trim() || undefined,
      mapsUrl,
      timezone: settledTimeZone(content.trip.timezone),
    },
    schedule,
    packing: input.enabledBlocks.packing ? packingFromRows(input.packingRows) : undefined,
    rsvp: rsvpForDraft(
      content.rsvp,
      input.rsvpHeading,
      input.rsvpDescription,
      input.plusOnes,
    ),
    presentation: {
      style: input.presentationStyle,
    },
  };

  if (input.enabledBlocks.activities) {
    next.activities = activitiesFromRows(input.activityRows, content.activities);
  } else {
    next.activities = undefined;
  }

  if (input.enabledBlocks.lodging) {
    const lodging = lodgingFromFields(input, content);
    if (lodging.error) return { ok: false, error: lodging.error };
    next.lodging = lodging.lodging;
  } else {
    next.lodging = undefined;
  }

  next.draftReview = {
    ...(content.draftReview ?? { facts: [] }),
    acknowledged: input.reviewAcknowledged,
    facts: draftFactsForContent(next, content.draftReview?.facts),
  };

  return { ok: true, content: next };
}

/** Apply unsaved valid fields onto the last good preview. Invalid dates/URLs/rows stay put. */
export function livePreviewContent(input: HostLiveDraftInput, lastValid: PartyContent): PartyContent {
  const built = buildHostDraft(input);
  if (built.ok) return built.content;

  const next: PartyContent = {
    ...lastValid,
    kind: "trip",
    preset: input.preset,
    trip: {
      ...lastValid.trip,
      siteName: input.content.trip.siteName?.trim() || lastValid.trip.siteName,
      tagline: input.content.trip.tagline?.trim() || undefined,
      startTime: input.content.trip.startTime?.trim() || undefined,
      location: input.content.trip.location?.trim() || undefined,
      address: input.content.trip.address?.trim() || undefined,
      timezone: settledTimeZone(input.content.trip.timezone) ?? lastValid.trip.timezone,
    },
    rsvp: rsvpForDraft(
      lastValid.rsvp,
      input.rsvpHeading,
      input.rsvpDescription,
      input.plusOnes,
    ),
    presentation: { style: input.presentationStyle },
  };

  const startDate = input.content.trip.startDate?.trim() || "";
  const endDate = input.content.trip.endDate?.trim() || "";
  if (!isInvertedDateRange(startDate, endDate)) {
    next.trip.startDate = startDate || undefined;
    next.trip.endDate = endDate || undefined;
    next.trip.dateLabel = formatDateLabel(startDate, endDate);
  }

  const mapsUrlValue = input.mapsUrl.trim();
  if (!mapsUrlValue) {
    next.trip.mapsUrl = undefined;
  } else {
    const mapsUrl = urlForSave(mapsUrlValue, lastValid.trip.mapsUrl);
    if (mapsUrl) next.trip.mapsUrl = mapsUrl;
  }

  if (input.enabledBlocks.schedule) {
    try {
      next.schedule = scheduleFromRows(input.scheduleRows);
    } catch {
      next.schedule = lastValid.schedule;
    }
  } else {
    next.schedule = undefined;
  }

  next.packing = input.enabledBlocks.packing ? packingFromRows(input.packingRows) : undefined;
  next.activities = input.enabledBlocks.activities
    ? activitiesFromRows(input.activityRows, lastValid.activities)
    : undefined;

  if (input.enabledBlocks.lodging) {
    const lodging = lodgingFromFields(input, lastValid);
    if (!lodging.error) next.lodging = lodging.lodging;
  } else {
    next.lodging = undefined;
  }

  return next;
}

export function hostPreviewCaption(source: HostPreviewSource, dirty: boolean): string | null {
  if (source === "guests") return "Guests currently see";
  if (dirty) return "Previewing unsaved";
  return null;
}

export function draftInputPreset(content: PartyContent): EventPreset {
  return parseEventPreset(content.preset);
}
