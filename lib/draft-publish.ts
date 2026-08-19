import type { PartyContent, ScheduleDay, ScheduleEntry } from "@/lib/party-types";

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
    const title = timed ? fields[4] : fields[3];
    const note = fields.length === 6 ? fields[5] : undefined;
    const existing = days.get(date);
    const entry: ScheduleEntry = { title };
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
        [day.date, day.weekday, day.label, ...(day.timed ? [entry.time ?? ""] : []), entry.title, ...(entry.note ? [entry.note] : [])].join(" | "),
      ),
    )
    .join("\n");
}
