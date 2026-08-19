import { describe, expect, it } from "vitest";
import {
  isKeyEvent,
  keyEventCount,
  markKeyEvent,
  setDayKeyEvent,
} from "@/lib/key-events";
import type { ScheduleDay, ScheduleEntry } from "@/lib/party-types";

const entries: ScheduleEntry[] = [
  { time: "11:00 AM", title: "Arrivals" },
  { time: "3:00 PM", title: "Check in", marquee: true },
  { time: "7:00 PM", title: "Dinner" },
];

const friday: ScheduleDay = {
  key: "friday",
  date: "2030-08-30",
  weekday: "Friday",
  label: "Arrival day",
  timed: true,
  entries,
};

describe("key events", () => {
  it("counts and detects marquee entries", () => {
    expect(isKeyEvent(entries[0])).toBe(false);
    expect(isKeyEvent(entries[1])).toBe(true);
    expect(keyEventCount(entries)).toBe(1);
  });

  it("marks and unmarks without leaving marquee: false", () => {
    const marked = markKeyEvent(entries, 2, true);
    expect(marked.ok).toBe(true);
    if (!marked.ok) return;
    expect(marked.entries[2].marquee).toBe(true);
    expect(keyEventCount(marked.entries)).toBe(2);

    const unmarked = markKeyEvent(marked.entries, 1, false);
    expect(unmarked.ok).toBe(true);
    if (!unmarked.ok) return;
    expect(unmarked.entries[1].marquee).toBeUndefined();
    expect(keyEventCount(unmarked.entries)).toBe(1);
  });

  it("lets a host mark every item on a day", () => {
    const second = markKeyEvent(entries, 2, true);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const third = markKeyEvent(second.entries, 0, true);
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(keyEventCount(third.entries)).toBe(3);
  });

  it("toggles by day key on a schedule", () => {
    const next = setDayKeyEvent([friday], "friday", 2, true);
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.schedule[0].entries[2].marquee).toBe(true);

    const missing = setDayKeyEvent([friday], "saturday", 0, true);
    expect(missing.ok).toBe(false);
  });
});
