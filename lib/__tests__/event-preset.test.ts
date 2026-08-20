import { describe, expect, it } from "vitest";
import { EVENT_PRESET_LABELS, parseEventPreset, showWeekendEditorBlock, weekendBlocksFilled } from "@/lib/event-preset";
import type { PartyContent } from "@/lib/party-types";

const night: PartyContent = { kind: "trip", preset: "night-out", trip: { siteName: "Thursday dinner" } };
const weekend: PartyContent = {
  kind: "trip",
  preset: "weekend",
  trip: { siteName: "Cabin" },
  lodging: { name: "The Cabin" },
  packing: [{ title: "ID" }],
};

describe("event presets", () => {
  it("defaults unknown values to weekend without inventing blocks", () => {
    expect(parseEventPreset(undefined)).toBe("weekend");
    expect(parseEventPreset("night-out")).toBe("night-out");
    expect(EVENT_PRESET_LABELS["night-out"]).toBe("Night out");
    expect(weekendBlocksFilled(night)).toEqual([]);
  });

  it("keeps one Event model: night-out can still show a block once it has data", () => {
    expect(showWeekendEditorBlock(night, "packing")).toBe(false);
    expect(showWeekendEditorBlock(weekend, "packing")).toBe(true);
    expect(showWeekendEditorBlock({ ...night, packing: [{ title: "Jacket" }] }, "packing")).toBe(true);
    expect(
      showWeekendEditorBlock(
        {
          ...night,
          schedule: [
            {
              key: "2026-09-04",
              date: "2026-09-04",
              weekday: "Friday",
              label: "Friday",
              timed: false,
              entries: [],
            },
          ],
        },
        "schedule",
      ),
    ).toBe(false);
  });
});
