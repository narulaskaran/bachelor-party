import type { PartyContent } from "@/lib/party-types";
import { hasActivities, hasLodging, hasPacking, hasSchedule } from "@/lib/trip-sections";

/** One Event model, three host starting points. Empty blocks stay hidden for guests. */
export const EVENT_PRESETS = ["night-out", "weekend", "celebration"] as const;
export type EventPreset = (typeof EVENT_PRESETS)[number];

export const EVENT_PRESET_LABELS: Record<EventPreset, string> = {
  "night-out": "Party",
  weekend: "Group trip",
  celebration: "Celebration",
};

export const EVENT_PRESET_HINTS: Record<EventPreset, string> = {
  "night-out": "Details + RSVP",
  weekend: "Adds schedule, lodge, activities, pack",
  celebration: "Details + RSVP",
};

export const EVENT_PRESET_PLACEHOLDERS: Record<EventPreset, string> = {
  "night-out":
    "Friday drinks at Rita's on 6th around 7. I don't have the exact address yet.",
  weekend:
    "Long weekend upstate Friday through Sunday. Cabin if I can find one, hike Saturday.",
  celebration:
    "Maya's birthday dinner on Saturday, June 14 around 7. Venue still to be confirmed.",
};

export function isEventPreset(value: unknown): value is EventPreset {
  return typeof value === "string" && (EVENT_PRESETS as readonly string[]).includes(value);
}

export function parseEventPreset(value: unknown): EventPreset {
  return isEventPreset(value) ? value : "weekend";
}

/** Weekend-only blocks. Party is details + RSVP; these stay optional. */
export type WeekendBlock = "schedule" | "lodging" | "activities" | "packing";

export const WEEKEND_SECTION_OPTIONS: { block: WeekendBlock; label: string }[] = [
  { block: "lodging", label: "Lodge" },
  { block: "schedule", label: "Schedule" },
  { block: "activities", label: "Activities" },
  { block: "packing", label: "Pack" },
];

export function eventBlockLabel(preset: EventPreset, block: WeekendBlock): string {
  if (preset !== "celebration") {
    return WEEKEND_SECTION_OPTIONS.find((option) => option.block === block)?.label ?? block;
  }
  return {
    lodging: "Venue / stay",
    schedule: "Run of show",
    activities: "Activities",
    packing: "What to bring",
  }[block];
}

export function weekendBlocksFilled(content: PartyContent): WeekendBlock[] {
  const filled: WeekendBlock[] = [];
  if (hasSchedule(content)) filled.push("schedule");
  if (hasLodging(content)) filled.push("lodging");
  if (hasActivities(content)) filled.push("activities");
  if (hasPacking(content)) filled.push("packing");
  return filled;
}

/** Show a weekend fieldset when the preset is weekend or the block already has data. */
export function showWeekendEditorBlock(content: PartyContent, block: WeekendBlock): boolean {
  const preset = content.preset ?? "weekend";
  if (preset === "weekend") return true;
  return weekendBlocksFilled(content).includes(block);
}
