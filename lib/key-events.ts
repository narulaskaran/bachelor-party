import type { ScheduleDay, ScheduleEntry } from "@/lib/party-types";

export const KEY_EVENT_HINT =
  "Key events are the day's headlines. They stand out on the guest timeline.";

export function isKeyEvent(entry: { marquee?: boolean }): boolean {
  return entry.marquee === true;
}

export function keyEventCount(entries: { marquee?: boolean }[]): number {
  return entries.filter(isKeyEvent).length;
}

export function markKeyEvent(
  entries: ScheduleEntry[],
  index: number,
  key: boolean,
): { ok: true; entries: ScheduleEntry[] } | { ok: false; error: string } {
  if (index < 0 || index >= entries.length) {
    return { ok: false, error: "That schedule item is gone." };
  }
  if (isKeyEvent(entries[index]) === key) {
    return { ok: true, entries };
  }

  const next = entries.map((entry, i) => {
    if (i !== index) return entry;
    if (key) return { ...entry, marquee: true };
    const unmarked = { ...entry };
    delete unmarked.marquee;
    return unmarked;
  });
  return { ok: true, entries: next };
}

export function setDayKeyEvent(
  schedule: ScheduleDay[],
  dayKey: string,
  entryIndex: number,
  key: boolean,
): { ok: true; schedule: ScheduleDay[] } | { ok: false; error: string } {
  const dayIndex = schedule.findIndex((day) => day.key === dayKey);
  if (dayIndex < 0) {
    return { ok: false, error: "That day is gone." };
  }
  const marked = markKeyEvent(schedule[dayIndex].entries, entryIndex, key);
  if (!marked.ok) return marked;
  return {
    ok: true,
    schedule: schedule.map((day, i) =>
      i === dayIndex ? { ...day, entries: marked.entries } : day,
    ),
  };
}
