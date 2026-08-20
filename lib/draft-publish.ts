import type { PackingItem, PartyContent, RsvpConfig, ScheduleDay, ScheduleEntry } from "@/lib/party-types";

export type DraftPartyState = {
  content: PartyContent;
  draftContent?: PartyContent | null;
  published: boolean;
};

export function initialDraftState(content: PartyContent): DraftPartyState {
  return { content, draftContent: content, published: false };
}

export function draftForParty(party: DraftPartyState): PartyContent {
  return party.draftContent ?? party.content;
}

export function publishedForGuests(party: DraftPartyState): PartyContent | null {
  return party.published ? party.content : null;
}

/**
 * Parse the editor's readable schedule format:
 * date | weekday | day label | time | event title | optional note
 * A four-column line omits time and is useful for loose plans.
 */
export function parseScheduleText(value: string): ScheduleDay[] {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const days = new Map<string, ScheduleDay>();

  for (const [lineIndex, line] of lines.entries()) {
    const fields = line.split("|").map((field) => field.trim());
    if (fields.length < 4 || fields.length > 6 || fields.some((field) => !field)) {
      throw new Error(`Schedule line ${lineIndex + 1} needs date | weekday | day label | time | event title`);
    }
    const [date, weekday, label] = fields;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Schedule line ${lineIndex + 1} needs a YYYY-MM-DD date`);
    }
    const timed = fields.length >= 5;
    const time = timed ? fields[3] : undefined;
    const rawTitle = timed ? fields[4] : fields[3];
    const marquee = rawTitle.startsWith("[key] ");
    const title = marquee ? rawTitle.slice("[key] ".length).trim() : rawTitle;
    const note = fields.length === 6 ? fields[5] : undefined;
    const existing = days.get(date);
    const entry: ScheduleEntry = { title };
    if (marquee) entry.marquee = true;
    if (time) entry.time = time;
    if (note) entry.note = note;
    if (existing) {
      existing.entries.push(entry);
    } else {
      days.set(date, {
        key: date,
        date,
        weekday,
        label,
        timed,
        entries: [entry],
      });
    }
  }

  return [...days.values()];
}

export function scheduleToText(schedule: ScheduleDay[] = []): string {
  return schedule
    .flatMap((day) =>
      day.entries.map((entry) =>
        [
          day.date,
          day.weekday,
          day.label,
          ...(day.timed ? [entry.time ?? ""] : []),
          `${entry.marquee ? "[key] " : ""}${entry.title}`,
          ...(entry.note ? [entry.note] : []),
        ].join(" | "),
      ),
    )
    .join("\n");
}

/**
 * Keep key-event picks made in the separate host picker when an editor save
 * was based on an older schedule snapshot. The editor passes an explicit
 * "schedule unchanged" signal, so removing a `[key]` marker in the editor
 * still remains an intentional edit.
 */
export function preserveScheduleKeyEvents(
  previous: ScheduleDay[] | undefined,
  next: ScheduleDay[] | undefined,
): ScheduleDay[] | undefined {
  if (!previous || !next) return next;
  const previousByDate = new Map(previous.map((day) => [day.date, day]));
  return next.map((day) => {
    const oldDay = previousByDate.get(day.date);
    if (!oldDay) return day;
    return {
      ...day,
      entries: day.entries.map((entry, index) => {
        const oldEntry = oldDay.entries[index];
        if (
          !oldEntry ||
          oldEntry.title !== entry.title ||
          oldEntry.time !== entry.time ||
          oldEntry.note !== entry.note
        ) {
          return entry;
        }
        return oldEntry.marquee === true && entry.marquee !== true
          ? { ...entry, marquee: true }
          : entry;
      }),
    };
  });
}

export function rsvpForDraft(
  existing: RsvpConfig | undefined,
  heading: string,
  description: string,
  plusOnePolicy?: "allowed" | "not-allowed",
): RsvpConfig {
  const policy = plusOnePolicy ?? existing?.plusOnePolicy;
  return {
    ...existing,
    heading: heading.trim() || undefined,
    description: description.trim() || undefined,
    plusOnePolicy: policy,
    allowPlusOne: policy === "allowed" ? true : policy === "not-allowed" ? false : existing?.allowPlusOne,
  };
}

export function parsePackingText(value: string): PackingItem[] | undefined {
  const items = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, note] = line.split("|").map((part) => part.trim());
      const item: PackingItem = { title };
      if (note) item.note = note;
      return item;
    })
    .filter((item) => item.title.length > 0);
  return items.length ? items : undefined;
}

export function packingToText(packing: PackingItem[] = []): string {
  return packing
    .filter((item) => item.title.trim())
    .map((item) => (item.note ? `${item.title} | ${item.note}` : item.title))
    .join("\n");
}
