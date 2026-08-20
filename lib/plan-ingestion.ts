import { isValidCalendarDate } from "@/lib/trip-dates";
import type { DraftFact, DraftFactStatus, DraftReview, PartyContent, ScheduleDay } from "@/lib/party-types";

export type IngestionOverrides = {
  siteName?: string;
  startDate?: string;
  endDate?: string;
};

export type IngestionResult = {
  content: PartyContent;
  review: DraftReview;
};

const CANONICAL_FACTS = [
  ["trip.siteName", "Event name"],
  ["trip.startDate", "Start date"],
  ["trip.endDate", "End date"],
  ["trip.location", "Location"],
  ["trip.timezone", "Timezone"],
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

function clean(value: string | undefined): string | undefined {
  const result = value?.replace(/^[-*•\s]+/, "").trim();
  return result || undefined;
}

function fact(path: string, label: string, status: DraftFactStatus, value?: string, note?: string, source?: string): DraftFact {
  return { path, label, status, ...(value ? { value } : {}), ...(note ? { note } : {}), ...(source ? { source } : {}) };
}

/** Reconcile review facts with the canonical fields after a host edit. */
export function draftFactsForContent(content: PartyContent, previousFacts: DraftFact[] = []): DraftFact[] {
  const previousByPath = new Map(previousFacts.map((item) => [item.path, item]));
  const values: Record<string, string | undefined> = {
    "trip.siteName": content.trip.siteName,
    "trip.startDate": content.trip.startDate,
    "trip.endDate": content.trip.endDate,
    "trip.location": content.trip.location,
    "trip.timezone": content.trip.timezone,
    "lodging.name": content.lodging?.name,
    schedule: content.schedule?.length ? `${content.schedule.reduce((count, day) => count + day.entries.length, 0)} item(s)` : undefined,
  };
  const notes: Record<string, string | undefined> = {
    "trip.endDate": "A second date is not confirmed.",
    "trip.location": "Location stays TBD until you confirm it.",
    "trip.timezone": "Times without a timezone are not settled logistics.",
    "lodging.name": "Lodging stays TBD until you confirm it.",
    schedule: "Add dated times only when they are explicit in the plan.",
  };

  return CANONICAL_FACTS.map(([path, label]) => {
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
  const location = labeled(plan, ["location", "where"]);
  const lodging = labeled(plan, ["lodging", "hotel", "cabin", "stay"]);
  const timezone = labeled(plan, ["timezone", "time zone"]).value ?? plan.match(TIMEZONE_RE)?.[0];
  const schedule = scheduleFromPlan(plan, dates.dates);
  const titleStatus: DraftFactStatus = overrides.siteName ? "confirmed" : title ? "extracted" : "missing";
  const startDateStatus: DraftFactStatus = overrides.startDate ? "confirmed" : startDate ? "extracted" : "missing";
  const endDateStatus: DraftFactStatus = overrides.endDate ? "confirmed" : endDate ? "extracted" : "missing";
  const locationStatus: DraftFactStatus = location.value ? "extracted" : "missing";
  const lodgingStatus: DraftFactStatus = lodging.value ? "extracted" : "missing";
  const timezoneStatus: DraftFactStatus = timezone ? "extracted" : "missing";
  const dateNote = dates.malformed.length ? `Could not use ${dates.malformed.join(", ")}; confirm the date.` : !dates.dates.length ? "No complete calendar date found." : undefined;
  const facts: DraftFact[] = [
    fact("trip.siteName", "Event name", titleStatus, title, title ? undefined : "Add a name before sharing.", titled.source),
    fact("trip.startDate", "Start date", startDateStatus, startDate, dateNote, dates.source),
    fact("trip.endDate", "End date", endDateStatus, endDate, dates.dates.length < 2 ? "A second date is not confirmed." : undefined, dates.source),
    fact("trip.location", "Location", locationStatus, location.value, "Location stays TBD until you confirm it.", location.source),
    fact("lodging.name", "Lodging", lodgingStatus, lodging.value, "Lodging stays TBD until you confirm it.", lodging.source),
    fact("trip.timezone", "Timezone", timezoneStatus, timezone, "Times without a timezone are not settled logistics.", timezone ? String(timezone) : undefined),
    fact("schedule", "Schedule", schedule ? "extracted" : "missing", schedule ? `${schedule.reduce((count, day) => count + day.entries.length, 0)} item(s)` : undefined, schedule ? undefined : "Add dated times only when they are explicit in the plan."),
  ];
  const review: DraftReview = {
    acknowledged: false,
    sourcePlan: plan || undefined,
    facts,
  };
  const content: PartyContent = {
    kind: "trip",
    trip: {
      siteName: title ?? "Untitled event",
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(startDate || endDate ? { dateLabel: startDate && endDate ? `${startDate} – ${endDate}` : startDate ?? endDate } : {}),
      ...(location.value ? { location: location.value } : {}),
      ...(timezone ? { timezone: String(timezone) } : {}),
    },
    ...(lodging.value ? { lodging: { name: lodging.value } } : {}),
    ...(schedule ? { schedule } : {}),
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
