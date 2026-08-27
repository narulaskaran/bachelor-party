import {
  isPlanExtractionUnavailable,
  PlanExtractionUnavailableError,
} from "@/lib/plan-ingest-errors";
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

export type ExtractedScheduleEntry = {
  date: string;
  time?: string;
  title: string;
};

/** Facts lifted from a plan dump. Empty fields stay empty — never invent. */
export type ExtractedPlanFacts = {
  siteName?: string;
  siteNameSource?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  datesSource?: string;
  malformedDates?: string[];
  tagline?: string;
  taglineSource?: string;
  location?: string;
  locationSource?: string;
  address?: string;
  timezoneRaw?: string;
  timezoneSource?: string;
  lodging?: string;
  lodgingSource?: string;
  packing?: PackingItem[];
  schedule?: ScheduleDay[];
  scheduleEntries?: ExtractedScheduleEntry[];
};

export type PlanExtractFn = (
  plan: string,
  ctx: { preset?: EventPreset; now: Date },
) => Promise<ExtractedPlanFacts>;

export type IngestEventPlanOptions = {
  extract?: PlanExtractFn;
  now?: Date;
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
  const clock = content.trip.startTime?.trim();
  const timezone = settledTimeZone(content.trip.timezone);
  const timezoneNeededForClock = Boolean(clock && !timezone);
  const clockNote = timezoneNeededForClock
    ? `Extracted clock ${clock}; timezone needed before sharing.`
    : undefined;

  const weekend = (content.preset ?? "weekend") === "weekend" || Boolean(values["lodging.name"] || values.schedule);
  const fields = weekend ? [...CORE_FACTS, ...WEEKEND_FACTS] : [...CORE_FACTS];

  return fields.map(([path, label]) => {
    const value = values[path];
    const previous = previousByPath.get(path);
    const changed = previous !== undefined && previous.value !== value;
    const timezonePending = path === "trip.startDate" && timezoneNeededForClock;
    const wasTimezonePending = path === "trip.startDate" && /timezone needed/i.test(previous?.note ?? "");
    const next: DraftFact = {
      path,
      label,
      status: value
        ? timezonePending
          ? "extracted"
          : changed || wasTimezonePending
            ? "confirmed"
            : previous?.status ?? "confirmed"
        : "missing",
    };
    if (value) next.value = value;
    if (!changed && previous?.source) next.source = previous.source;
    if (!value) next.note = previous?.note ?? notes[path];
    else if (timezonePending) next.note = clockNote;
    else if (!changed && !wasTimezonePending && previous?.note) next.note = previous.note;
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
  ISO_DATE_RE.lastIndex = 0;
  for (const match of plan.matchAll(ISO_DATE_RE)) {
    const raw = match[0];
    const value = validIso(raw);
    if (value) dates.push(value);
    else malformed.push(raw);
  }
  NATURAL_DATE_RE.lastIndex = 0;
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

/** Inclusive `YYYY-MM-DD to YYYY-MM-DD` (or dash/through). Never invent a middle day. */
const ISO_RANGE_RE =
  /\b(\d{4}-\d{1,2}-\d{1,2})\s*(?:to|through|until|–|—|-)\s*(\d{4}-\d{1,2}-\d{1,2})\b/gi;

function explicitIsoRanges(plan: string): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = [];
  ISO_RANGE_RE.lastIndex = 0;
  for (const match of plan.matchAll(ISO_RANGE_RE)) {
    const start = validIso(match[1]);
    const end = validIso(match[2]);
    if (!start || !end || end < start) continue;
    ranges.push({ start, end });
  }
  return ranges;
}

function spanFromPlan(plan: string): { start?: string; end?: string } {
  const dates = explicitDates(plan).dates;
  const ranges = explicitIsoRanges(plan);
  const unique = [...new Map(ranges.map((range) => [`${range.start}:${range.end}`, range])).values()];
  if (unique.length === 1) return unique[0];
  if (unique.length > 1) return { start: dates[0] };
  if (dates.length === 1) return { start: dates[0] };
  if (dates.length === 2) return { start: dates[0], end: dates[1] };
  if (dates.length > 2) return { start: dates[0] };
  return {};
}

function labeled(plan: string, labels: string[]): { value?: string; source?: string } {
  const expression = new RegExp(`(?:^|\\n)\\s*(?:${labels.join("|")})\\s*[:=-]\\s*(.+)`, "im");
  const match = expression.exec(plan);
  return match ? { value: clean(match[1]), source: match[0].trim() } : {};
}

const LABELED_FACT_LINE_RE =
  /^(event|trip|title|name|where|location|when|date|end date|lodging|lodge|hotel|cabin|stay|rsvp|timezone|time zone|what|tagline|description|address|maps|pack|packing|bring|schedule)\s*[:=-]/i;

function isLabeledFactLine(line: string): boolean {
  return LABELED_FACT_LINE_RE.test(line);
}

/** First unlabeled line is the name. A comma-joined dump is not the title. */
function shortTitleFromUnlabeledLine(line: string): string {
  if (!/[,;]/.test(line) && line.length <= 48) return line;
  const clause = line.split(/\s*[,;]\s*/)[0]?.trim() || line;
  if (/[,;]/.test(line)) {
    const beforePlace = clause.split(/\s+in\s+/i)[0]?.trim();
    if (beforePlace && beforePlace !== clause && beforePlace.split(/\s+/).length <= 5) {
      return beforePlace.slice(0, 48);
    }
  }
  if (clause.length <= 48) return clause;
  const truncated = clause.slice(0, 48);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace >= 8 ? truncated.slice(0, lastSpace) : truncated).trim();
}

function titleFromPlan(plan: string): { value?: string; source?: string } {
  const labeledTitle = labeled(plan, ["event", "trip", "title", "name"]);
  if (labeledTitle.value) return { value: labeledTitle.value.slice(0, 100), source: labeledTitle.source };
  const first = plan
    .split(/\r?\n/)
    .map(clean)
    .find((line) => line && !isLabeledFactLine(line));
  if (!first) return {};
  const value = shortTitleFromUnlabeledLine(first);
  return value ? { value: value.slice(0, 100), source: first } : {};
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

function scheduleDaysFromEntries(entries: ExtractedScheduleEntry[]): ScheduleDay[] | undefined {
  if (!entries.length) return undefined;
  const days = new Map<string, ScheduleDay>();
  for (const entry of entries) {
    const date = validIso(entry.date);
    const title = settledText(entry.title);
    if (!date || !title) continue;
    const existing = days.get(date);
    const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    const day = existing ?? { key: date, date, weekday, label: weekday, timed: true, entries: [] };
    day.entries.push({ ...(entry.time ? { time: entry.time } : {}), title });
    days.set(date, day);
  }
  return days.size ? [...days.values()].sort((a, b) => a.date.localeCompare(b.date)) : undefined;
}

function extractPlanHeuristically(plan: string): ExtractedPlanFacts {
  const titled = titleFromPlan(plan);
  const dates = explicitDates(plan);
  const span = spanFromPlan(plan);
  const labeledLocation = labeled(plan, ["location", "where"]);
  const labeledLodging = labeled(plan, ["lodging", "lodge", "hotel", "cabin", "stay"]);
  const labeledTimezone = labeled(plan, ["timezone", "time zone"]);
  const labeledWhat = labeled(plan, ["what", "tagline", "description"]);
  const labeledAddress = labeled(plan, ["address"]);
  const facts: ExtractedPlanFacts = {
    siteName: titled.value,
    siteNameSource: titled.source,
    startDate: span.start,
    endDate: span.end,
    startTime: firstClockTime(plan),
    datesSource: dates.source,
    malformedDates: dates.malformed,
    tagline: settledText(labeledWhat.value),
    taglineSource: labeledWhat.source,
    location: settledText(labeledLocation.value),
    locationSource: labeledLocation.source,
    address: settledText(labeledAddress.value),
    timezoneRaw: labeledTimezone.value ?? plan.match(TIMEZONE_RE)?.[0],
    timezoneSource: labeledTimezone.source,
    lodging: settledText(labeledLodging.value),
    lodgingSource: labeledLodging.source,
    packing: packingFromPlan(plan),
    schedule: scheduleFromPlan(plan, dates.dates),
  };
  if (!facts.timezoneSource && facts.timezoneRaw) facts.timezoneSource = facts.timezoneRaw;
  return facts;
}

/** Labeled lines or complete calendar dates — the regex parser can still help. */
export function heuristicFallbackUseful(plan: string): boolean {
  if (plan.split(/\r?\n/).some((line) => isLabeledFactLine(line.trim()))) return true;
  ISO_DATE_RE.lastIndex = 0;
  if (ISO_DATE_RE.test(plan)) return true;
  NATURAL_DATE_RE.lastIndex = 0;
  for (const match of plan.matchAll(NATURAL_DATE_RE)) {
    if (match[3]) return true;
  }
  return false;
}

export function assembleIngestion(
  plan: string,
  extracted: ExtractedPlanFacts,
  overrides: IngestionOverrides = {},
): IngestionResult {
  const titled = { value: extracted.siteName, source: extracted.siteNameSource };
  const title = clean(overrides.siteName) ?? titled.value;
  const startDate = clean(overrides.startDate) ?? extracted.startDate;
  const endDate = clean(overrides.endDate) ?? extracted.endDate;
  const locationValue = settledText(extracted.location);
  const lodgingValue = settledText(extracted.lodging);
  const rawTimezone = extracted.timezoneRaw;
  const timezone = settledTimeZone(rawTimezone);
  const packing = extracted.packing;
  const schedule = extracted.schedule ?? scheduleDaysFromEntries(extracted.scheduleEntries ?? []);
  const preset = parseEventPreset(overrides.preset);
  const tagline = settledText(extracted.tagline);
  const address = settledText(extracted.address);
  const startTime = extracted.startTime;
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
  const malformed = extracted.malformedDates ?? [];
  const dateNote = malformed.length
    ? `Could not use ${malformed.join(", ")}; confirm the date.`
    : !startDate && !endDate
      ? "No complete calendar date found."
      : undefined;
  const whenValue = [startDate, nightOut ? startTime : undefined].filter(Boolean).join(" ") || undefined;
  const facts: DraftFact[] = [
    fact("trip.siteName", "Event name", titleStatus, title, title ? undefined : "Add a name before sharing.", titled.source),
    fact("trip.startDate", "When", startDateStatus, whenValue, dateNote, extracted.datesSource),
    fact("trip.endDate", "End date", endDateStatus, endDate, endDate ? undefined : "A second date is not confirmed.", extracted.datesSource),
    fact("trip.tagline", "What", tagline ? "extracted" : "missing", tagline, "Add a one-line description when you know it.", extracted.taglineSource),
    fact("trip.location", "Where", locationStatus, [locationValue, address].filter(Boolean).join(" · ") || undefined, "Location stays TBD until you confirm it.", extracted.locationSource),
    fact("trip.timezone", "Timezone", timezoneStatus, timezone, timezoneNote, extracted.timezoneSource ?? rawTimezone),
  ];
  if (!nightOut) {
    facts.push(
      fact("lodging.name", "Lodging", lodgingStatus, lodgingForContent, "Lodging stays TBD until you confirm it.", extracted.lodgingSource),
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

/** Last-resort labeled/ISO parser. Never invents. */
export function ingestEventPlanFromHeuristics(
  planInput: string,
  overrides: IngestionOverrides = {},
): IngestionResult {
  const plan = planInput.trim();
  return assembleIngestion(plan, extractPlanHeuristically(plan), overrides);
}

/**
 * Shared dump → draft path for landing and agent create.
 * Tries the model extractor first; falls back to the regex parser only when
 * that parser can still read labeled lines or complete dates.
 */
export async function ingestEventPlan(
  planInput: string,
  overrides: IngestionOverrides = {},
  options: IngestEventPlanOptions = {},
): Promise<IngestionResult> {
  const plan = planInput.trim();
  if (!plan) return ingestEventPlanFromHeuristics(planInput, overrides);

  const now = options.now ?? new Date();
  try {
    if (!options.extract) throw new PlanExtractionUnavailableError();
    const facts = await options.extract(plan, { preset: overrides.preset, now });
    return assembleIngestion(plan, facts, overrides);
  } catch (error) {
    if (!isPlanExtractionUnavailable(error)) throw error;
    if (heuristicFallbackUseful(plan)) {
      return ingestEventPlanFromHeuristics(planInput, overrides);
    }
    throw error instanceof PlanExtractionUnavailableError
      ? error
      : new PlanExtractionUnavailableError();
  }
}

export function reviewComplete(review: DraftReview | undefined): boolean {
  return review?.acknowledged === true;
}

export function stripDraftReview(content: PartyContent): PartyContent {
  const published = { ...content };
  delete published.draftReview;
  return published;
}
