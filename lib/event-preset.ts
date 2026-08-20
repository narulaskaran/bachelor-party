import type { PartyContent } from "@/lib/party-types";
import { hasActivities, hasLodging, hasPacking, hasSchedule } from "@/lib/trip-sections";

/** One Event model, two host starting points. Empty blocks stay hidden for guests. */
export const EVENT_PRESETS = ["night-out", "weekend"] as const;
export type EventPreset = (typeof EVENT_PRESETS)[number];

export const EVENT_PRESET_LABELS: Record<EventPreset, string> = {
  "night-out": "Night out",
  weekend: "Weekend trip",
};

export function isEventPreset(value: unknown): value is EventPreset {
  return value === "night-out" || value === "weekend";
}

export function parseEventPreset(value: unknown): EventPreset {
  return isEventPreset(value) ? value : "weekend";
}

/** Weekend-only blocks. Night out is details + RSVP; these stay optional. */
export type WeekendBlock = "schedule" | "lodging" | "activities" | "packing";

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
