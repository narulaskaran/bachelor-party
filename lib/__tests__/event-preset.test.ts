import { describe, expect, it } from "vitest";
import {
  EVENT_PRESET_HINTS,
  EVENT_PRESET_LABELS,
  EVENT_PRESET_PLACEHOLDERS,
  EVENT_PRESETS,
  isEventPreset,
  parseEventPreset,
  showWeekendEditorBlock,
  weekendBlocksFilled,
} from "@/lib/event-preset";
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
  it("exposes only Party and Group trip and rejects the removed preset", () => {
    expect(EVENT_PRESETS).toEqual(["night-out", "weekend"]);
    expect(isEventPreset("celebration")).toBe(false);
    expect(parseEventPreset("celebration")).toBe("weekend");
    expect(EVENT_PRESET_LABELS["night-out"]).toBe("Party");
    expect(EVENT_PRESET_LABELS.weekend).toBe("Group trip");
    expect(EVENT_PRESET_HINTS["night-out"]).toBe("Details + RSVP");
    expect(EVENT_PRESET_HINTS.weekend).toBe("Adds schedule, lodge, activities, pack");
    expect(EVENT_PRESET_PLACEHOLDERS["night-out"]).toBe(
      "Friday drinks at Rita's on 6th around 7. I don't have the exact address yet.",
    );
    expect(EVENT_PRESET_PLACEHOLDERS.weekend).toBe(
      "Long weekend upstate Friday through Sunday. Cabin if I can find one, hike Saturday.",
    );
  });

  it("defaults unknown values to weekend without inventing blocks", () => {
    expect(parseEventPreset(undefined)).toBe("weekend");
    expect(parseEventPreset("night-out")).toBe("night-out");
    expect(EVENT_PRESET_LABELS["night-out"]).toBe("Party");
    expect(EVENT_PRESET_LABELS.weekend).toBe("Group trip");
    expect(EVENT_PRESET_HINTS["night-out"]).toBe("Details + RSVP");
    expect(EVENT_PRESET_HINTS.weekend).toBe("Adds schedule, lodge, activities, pack");
    expect(EVENT_PRESET_PLACEHOLDERS["night-out"]).toBe(
      "Friday drinks at Rita's on 6th around 7. I don't have the exact address yet.",
    );
    expect(EVENT_PRESET_PLACEHOLDERS.weekend).toBe(
      "Long weekend upstate Friday through Sunday. Cabin if I can find one, hike Saturday.",
    );
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
