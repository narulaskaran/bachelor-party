import type { ScheduleDay, ScheduleEntry } from "@/lib/party-types";

export type ScheduleEditorRow = {
  date: string;
  time: string;
  title: string;
  note: string;
};

export function weekdayFromIsoDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

export function rowsFromSchedule(schedule?: ScheduleDay[]): ScheduleEditorRow[] {
  if (!schedule?.length) return [];
  return schedule.flatMap((day) =>
    day.entries.map((entry) => ({
      date: day.date,
      time: entry.time ?? "",
      title: entry.title,
      note: entry.note ?? "",
    })),
  );
}

export function scheduleFromRows(rows: ScheduleEditorRow[]): ScheduleDay[] | undefined {
  const filled = rows.filter((row) => row.title.trim());
  if (!filled.length) return undefined;
  const days = new Map<string, ScheduleDay>();

  for (const [index, row] of filled.entries()) {
    const date = row.date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Schedule row ${index + 1} needs a date.`);
    }
    const weekday = weekdayFromIsoDate(date);
    const time = row.time.trim() || undefined;
    const entry: ScheduleEntry = { title: row.title.trim() };
    if (time) entry.time = time;
    const note = row.note.trim();
    if (note) entry.note = note;
    const existing = days.get(date);
    if (existing) {
      existing.entries.push(entry);
      if (time) existing.timed = true;
    } else {
      days.set(date, {
        key: date,
        date,
        weekday,
        label: weekday,
        timed: Boolean(time),
        entries: [entry],
      });
    }
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export type PackEditorRow = { title: string; note: string };

export function rowsFromPacking(packing?: { title: string; note?: string }[]): PackEditorRow[] {
  return (packing ?? []).map((item) => ({ title: item.title, note: item.note ?? "" }));
}

export function packingFromRows(rows: PackEditorRow[]): { title: string; note?: string }[] | undefined {
  const items = rows
    .map((row) => {
      const title = row.title.trim();
      const note = row.note.trim();
      return title ? { title, ...(note ? { note } : {}) } : null;
    })
    .filter((item): item is { title: string; note?: string } => item !== null);
  return items.length ? items : undefined;
}

export type ActivityEditorRow = { name: string; note: string };

export function rowsFromActivities(
  activities?: { core?: { name: string; description?: string }[] },
): ActivityEditorRow[] {
  return (activities?.core ?? []).map((item) => ({
    name: item.name,
    note: item.description ?? "",
  }));
}
