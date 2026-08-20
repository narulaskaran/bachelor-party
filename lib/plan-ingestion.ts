import { formatDateLabel, isValidCalendarDate } from "@/lib/trip-dates";
import { parseEventPreset, type EventPreset } from "@/lib/event-preset";
import type { DraftFact, DraftFactStatus, DraftReview, PackingItem, PartyContent, ScheduleDay } from "@/lib/party-types";
import { settledTimeZone } from "@/lib/timezones";

export type IngestionOverrides = {
  siteName?: string;
  startDate?: string;
  endDate?: string;
  preset?: EventPreset;
};

export type IngestionResult = {
  content: PartyContent;
  review: DraftReview;
};

const CORE_FACTS = [
  ["trip.siteName", "Event name"],
  ["trip.startDate", "When"],
  ["trip.endDate", "End date"],
  ["trip.tagline", "What"],
  ["trip.location", "Where"],
  ["trip.timezone", "Timezone"],
] as const;

const WEEKEND_FACTS = [
  ["lodging.name", "Lodging"],
  ["schedule", "Schedule"],
] as const;

const MONTHS = new Map([
  ["jan", 1], ["january", 1], ["feb", 2], ["february", 2], ["mar", 3], ["march", 3],
  ["apr", 4], ["april", 4], ["may", 5], ["jun", 6], ["june", 6], ["jul", 7],
  ["july", 7], ["aug", 8], ["august", 8], ["sep", 9], ["sept", 9], ["september", 9],
  ["oct", 10], ["october", 10], ["nov", 11], ["november", 11], ["dec", 12], ["december", 12],
]);

const TIME_RE = /\b(?:[01]?\d|2[0-3]):[0-5]\d\s?(?:a\.m\.?|p\.m\.?|am|pm)?\b|\b(?:1[0-2]|0?[1-9])\s?(?:a\.m\.?|p\.m\.?|am|pm)\b/i;
const TIMEZONE_RE = /\b(?:UTC|GMT|ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT)\b/i;
const ISO_DATE_RE = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
const NATURAL_DATE_RE = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/gi;

const UNKNOWN_VALUE_RE = /^(tbd|tba|n\/?a|unknown|still deciding|not sure|none|to be (decided|determined)|—|-|\.{3}|…)$/i;

function clean(value: string | undefined): string | undefined {
  const result = value?.replace(/^[-*•\s]+/, "").trim();
  return result || undefined;
}

function isUnknown(value: string | undefined): boolean {
  return !value || UNKNOWN_VALUE_RE.test(value.trim());
}

function settledText(value: string | undefined): string | undefined {
  const cleaned = clean(value);
  return cleaned && !isUnknown(cleaned) ? cleaned : undefined;
}

function packingFromPlan(plan: string): PackingItem[] | undefined {
  const labeledPack = labeled(plan, ["pack", "packing", "bring"]);
  const raw = settledText(labeledPack.value);
  if (!raw) return undefined;
  const items = raw
    .split(/[,;]/)
    .map((part) => settledText(part))
    .filter((title): title is string => Boolean(title))
    .map((title) => {
      const [name, note] = title.split(/\s+[—–-]\s+/, 2);
      const item: PackingItem = { title: name.trim() };
      if (note?.trim()) item.note = note.trim();
      return item;
    })
    .filter((item) => item.title.length > 0);
  return items.length ? items : undefined;
}

function fact(path: string, label: string, status: DraftFactStatus, value?: string, note?: string, source?: string): DraftFact {
  return { path, label, status, ...(value ? { value } : {}), ...(note ? { note } : {}), ...(source ? { source } : {}) };
}

/** Reconcile review facts with the canonical fields after a host edit. */
export function draftFactsForContent(content: PartyContent, previousFacts: DraftFact[] = []): DraftFact[] {
  const previousByPath = new Map(previousFacts.map((item) => [item.path, item]));
  const values: Record<string, string | undefined> = {
    "trip.siteName": content.trip.siteName,
    "trip.startDate": [content.trip.startDate, content.trip.startTime].filter(Boolean).join(" ") || undefined,
    "trip.endDate": content.trip.endDate,
    "trip.tagline": content.trip.tagline,
    "trip.location": [content.trip.location, content.trip.address].filter(Boolean).join(" · ") || undefined,
    "trip.timezone": content.trip.timezone,
    "lodging.name": content.lodging?.name,
    schedule: content.schedule?.length ? `${content.schedule.reduce((count, day) => count + day.entries.length, 0)} item(s)` : undefined,
  };
  const notes: Record<string, string | undefined> = {
    "trip.endDate": "A second date is not confirmed.",
    "trip.tagline": "Add a one-line description when you know it.",
    "trip.location": "Location stays TBD until you confirm it.",
    "trip.timezone": "Times without a timezone are not settled logistics.",
    "lodging.name": "Lodging stays TBD until you confirm it.",
    schedule: "Add dated times only when they are explicit in the plan.",
  };

  const weekend = (content.preset ?? "weekend") === "weekend" || Boolean(values["lodging.name"] || values.schedule);
  const fields = weekend ? [...CORE_FACTS, ...WEEKEND_FACTS] : [...CORE_FACTS];

  return fields.map(([path, label]) => {
    const value = values[path];
    const previous = previousByPath.get(path);
    const changed = previous !== undefined && previous.value !== value;
    const next: DraftFact = {
      path,
      label,
      status: value ? (changed ? "confirmed" : previous?.status ?? "confirmed") : "missing",
    };
    if (value) next.value = value;
    if (!changed && previous?.source) next.source = previous.source;
    if (!value) next.note = previous?.note ?? notes[path];
    else if (!changed && previous?.note) next.note = previous.note;
    return next;
  });
}

function validIso(value: string): string | undefined {
  const normalized = value.replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/, (_, year, month, day) => `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  return isValidCalendarDate(normalized) ? normalized : undefined;
}

function explicitDates(plan: string): { dates: string[]; malformed: string[]; source?: string } {
  const dates: string[] = [];
  const malformed: string[] = [];
  for (const match of plan.matchAll(ISO_DATE_RE)) {
    const raw = match[0];
    const value = validIso(raw);
    if (value) dates.push(value);
    else malformed.push(raw);
  }
  for (const match of plan.matchAll(NATURAL_DATE_RE)) {
    const month = MONTHS.get(match[1].toLowerCase());
    const day = Number(match[2]);
    const year = match[3] ? Number(match[3]) : undefined;
    if (!year) continue;
    const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (isValidCalendarDate(value)) dates.push(value);
    else malformed.push(match[0]);
  }
  return { dates: [...new Set(dates)].sort(), malformed, source: dates.length || malformed.length ? plan : undefined };
}

function labeled(plan: string, labels: string[]): { value?: string; source?: string } {
  const expression = new RegExp(`(?:^|\\n)\\s*(?:${labels.join("|")})\\s*[:=-]\\s*(.+)`, "im");
  const match = expression.exec(plan);
  return match ? { value: clean(match[1]), source: match[0].trim() } : {};
}

function titleFromPlan(plan: string): { value?: string; source?: string } {
  const labeledTitle = labeled(plan, ["event", "trip", "title", "name"]);
  if (labeledTitle.value) return labeledTitle;
  const first = plan.split("\n").map(clean).find((line) => line && !/^(where|location|when|date|lodging|hotel|cabin|rsvp|timezone)\s*:/i.test(line));
  return first ? { value: first.slice(0, 100), source: first } : {};
}

function firstClockTime(plan: string): string | undefined {
  const match = plan.match(TIME_RE);
  return match?.[0]?.trim();
}

function scheduleFromPlan(plan: string, dates: string[]): ScheduleDay[] | undefined {
  const days = new Map<string, ScheduleDay>();
  const lines = plan.split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const isoMatch = line.match(/\b\d{4}-\d{1,2}-\d{1,2}\b/);
    const date = isoMatch ? validIso(isoMatch[0]) : undefined;
    const timeMatch = line.match(TIME_RE);
    if (!date || !timeMatch) continue;
    const afterTime = clean(line.slice((timeMatch.index ?? 0) + timeMatch[0].length).replace(/^[:|\u2013\u2014-]\s*/, ""));
    const title = afterTime?.replace(/^[|:\u2013\u2014-]\s*/, "").trim();
    if (!title) continue;
    const existing = days.get(date);
    const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    const day = existing ?? { key: date, date, weekday, label: weekday, timed: true, entries: [] };
    day.entries.push({ time: timeMatch[0].trim(), title });
    days.set(date, day);
  }
  if (!days.size || !dates.length) return undefined;
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function ingestEventPlan(planInput: string, overrides: IngestionOverrides = {}): IngestionResult {
  const plan = planInput.trim();
  const titled = titleFromPlan(plan);
  const title = clean(overrides.siteName) ?? titled.value;
  const dates = explicitDates(plan);
  const startDate = clean(overrides.startDate) ?? dates.dates[0];
  const endDate = clean(overrides.endDate) ?? dates.dates[1];
  const labeledLocation = labeled(plan, ["location", "where"]);
  const labeledLodging = labeled(plan, ["lodging", "hotel", "cabin", "stay"]);
  const locationValue = settledText(labeledLocation.value);
  const lodgingValue = settledText(labeledLodging.value);
  const labeledTimezone = labeled(plan, ["timezone", "time zone"]);
  const rawTimezone = labeledTimezone.value ?? plan.match(TIMEZONE_RE)?.[0];
  const timezone = settledTimeZone(rawTimezone);
  const packing = packingFromPlan(plan);
  const schedule = scheduleFromPlan(plan, dates.dates);
  const preset = parseEventPreset(overrides.preset);
  const labeledWhat = labeled(plan, ["what", "tagline", "description"]);
  const tagline = settledText(labeledWhat.value);
  const labeledAddress = labeled(plan, ["address"]);
  const address = settledText(labeledAddress.value);
  const startTime = firstClockTime(plan);
  const nightOut = preset === "night-out";
  const lodgingForContent = nightOut ? undefined : lodgingValue;
  const scheduleForContent = nightOut ? undefined : schedule;
  const packingForContent = nightOut ? undefined : packing;
  const titleStatus: DraftFactStatus = overrides.siteName ? "confirmed" : title ? "extracted" : "missing";
  const startDateStatus: DraftFactStatus = overrides.startDate ? "confirmed" : startDate ? "extracted" : "missing";
  const endDateStatus: DraftFactStatus = overrides.endDate ? "confirmed" : endDate ? "extracted" : "missing";
  const locationStatus: DraftFactStatus = locationValue ? "extracted" : "missing";
  const lodgingStatus: DraftFactStatus = lodgingForContent ? "extracted" : "missing";
  const timezoneStatus: DraftFactStatus = timezone ? "extracted" : "missing";
  const timezoneNote = timezone
    ? undefined
    : rawTimezone
      ? `Saw ${rawTimezone}; pick an IANA time zone. Abbreviations are not settled logistics.`
      : "Times without a timezone are not settled logistics.";
  const dateNote = dates.malformed.length ? `Could not use ${dates.malformed.join(", ")}; confirm the date.` : !dates.dates.length ? "No complete calendar date found." : undefined;
  const whenValue = [startDate, nightOut ? startTime : undefined].filter(Boolean).join(" ") || undefined;
  const facts: DraftFact[] = [
    fact("trip.siteName", "Event name", titleStatus, title, title ? undefined : "Add a name before sharing.", titled.source),
    fact("trip.startDate", "When", startDateStatus, whenValue, dateNote, dates.source),
    fact("trip.endDate", "End date", endDateStatus, endDate, dates.dates.length < 2 ? "A second date is not confirmed." : undefined, dates.source),
    fact("trip.tagline", "What", tagline ? "extracted" : "missing", tagline, "Add a one-line description when you know it.", labeledWhat.source),
    fact("trip.location", "Where", locationStatus, [locationValue, address].filter(Boolean).join(" · ") || undefined, "Location stays TBD until you confirm it.", labeledLocation.source),
    fact("trip.timezone", "Timezone", timezoneStatus, timezone, timezoneNote, labeledTimezone.source ?? rawTimezone),
  ];
  if (!nightOut) {
    facts.push(
      fact("lodging.name", "Lodging", lodgingStatus, lodgingForContent, "Lodging stays TBD until you confirm it.", labeledLodging.source),
      fact("schedule", "Schedule", scheduleForContent ? "extracted" : "missing", scheduleForContent ? `${scheduleForContent.reduce((count, day) => count + day.entries.length, 0)} item(s)` : undefined, scheduleForContent ? undefined : "Add dated times only when they are explicit in the plan."),
    );
  }
  const review: DraftReview = {
    acknowledged: false,
    sourcePlan: plan || undefined,
    facts,
  };
  const dateLabel = formatDateLabel(startDate, endDate);
  const content: PartyContent = {
    kind: "trip",
    preset,
    presentation: { style: "clean" },
    trip: {
      siteName: title ?? "Untitled event",
      ...(tagline ? { tagline } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(dateLabel ? { dateLabel } : {}),
      ...(locationValue ? { location: locationValue } : {}),
      ...(address ? { address } : {}),
      ...(timezone ? { timezone } : {}),
      ...(startTime ? { startTime } : {}),
    },
    rsvp: { plusOnePolicy: "allowed" },
    ...(lodgingForContent ? { lodging: { name: lodgingForContent } } : {}),
    ...(scheduleForContent ? { schedule: scheduleForContent } : {}),
    ...(packingForContent ? { packing: packingForContent } : {}),
    draftReview: review,
  };
  return { content, review };
}

export function reviewComplete(review: DraftReview | undefined): boolean {
  return review?.acknowledged === true;
}

export function stripDraftReview(content: PartyContent): PartyContent {
  const published = { ...content };
  delete published.draftReview;
  return published;
}
