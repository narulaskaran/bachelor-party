import {
  type Activity,
  type Lodging,
  type PackingItem,
  type PartyContent,
  type ScheduleDay,
  type Trip,
  pollActivities,
} from "@/lib/party-types";

export type GlanceFact = {
  label: string;
  value: string;
  note?: string;
};

export type VisibleSections = {
  glance: boolean;
  actionItems: boolean;
  schedule: boolean;
  activities: boolean;
  lodging: boolean;
  packing: boolean;
  rsvp: boolean;
};

export function hasLodging(content: PartyContent): boolean {
  return Boolean(content.lodging?.name);
}

export function showFlightFields(content: PartyContent): boolean {
  return Boolean(content.trip.airport);
}

export function nonemptyActivities(list?: Activity[]): Activity[] {
  return (list ?? []).filter((activity) => Boolean(activity.name?.trim()));
}

export function hasActivities(content: PartyContent): boolean {
  const a = content.activities;
  if (!a) return false;
  return (
    nonemptyActivities(a.core).length > 0 ||
    nonemptyActivities(a.ifTimeAllows).length > 0 ||
    nonemptyActivities(a.backups).length > 0
  );
}

export function nonemptyPacking(list?: PackingItem[]): PackingItem[] {
  return (list ?? []).filter((item) => Boolean(item.title?.trim()));
}

export function hasPacking(content: PartyContent): boolean {
  return nonemptyPacking(content.packing).length > 0;
}

/** Days that have at least one titled event. Empty or untitled days stay hidden. */
export function nonemptySchedule(schedule?: ScheduleDay[]): ScheduleDay[] {
  return (schedule ?? [])
    .map((day) => ({
      ...day,
      entries: (day.entries ?? []).filter((entry) => Boolean(entry.title?.trim())),
    }))
    .filter((day) => day.entries.length > 0);
}

export function hasSchedule(content: PartyContent): boolean {
  return nonemptySchedule(content.schedule).length > 0;
}

export function heroMeta(trip: Trip): string[] {
  return [trip.coordinates, trip.elevation, trip.dateLabel]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
}

export function glanceFacts(trip: Trip, lodging?: Lodging): GlanceFact[] {
  const facts: GlanceFact[] = [];
  if (trip.dateLabel) {
    facts.push({ label: "When", value: trip.dateLabel });
  }
  if (trip.location) {
    facts.push({
      label: "Where",
      value: trip.location,
      note: trip.airport ? `Fly into ${trip.airport}` : undefined,
    });
  }
  if (lodging) {
    const sleeps = lodgingSleepsLabel(lodging);
    if (sleeps) {
      facts.push({
        label: "Sleeps",
        value: sleeps,
        note:
          lodging.bathrooms != null && lodging.bathrooms > 0
            ? `${lodging.bathrooms} baths`
            : undefined,
      });
    }
    if (lodging.totalCost) {
      facts.push({
        label: "Total",
        value: lodging.totalCost,
        note: costEachNote(lodging.totalCost, lodging.beds),
      });
    }
  }
  return facts;
}

export function lodgingSleepsLabel(lodging: Lodging): string | null {
  const parts: string[] = [];
  if (lodging.bedrooms != null && lodging.bedrooms > 0) {
    parts.push(`${lodging.bedrooms}BR`);
  }
  if (lodging.beds != null && lodging.beds > 0) {
    parts.push(`${lodging.beds} beds`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function parseMoneyAmount(value: string): number | null {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function costEachNote(totalCost: string, headcount?: number): string {
  const total = parseMoneyAmount(totalCost);
  if (total != null && headcount != null && headcount > 0) {
    const each = Math.round(total / headcount);
    return `About $${each.toLocaleString("en-US")} each once everyone's in`;
  }
  return "You'll get a request once we know who's coming.";
}

export function visibleSections(content: PartyContent): VisibleSections {
  const weekendBlocks: VisibleSections = {
    glance: glanceFacts(content.trip, content.lodging).length > 0,
    actionItems: (content.actionItems?.length ?? 0) > 0,
    schedule: hasSchedule(content),
    activities: hasActivities(content),
    lodging: hasLodging(content),
    packing: hasPacking(content),
    rsvp: true,
  };
  if ((content.preset ?? "weekend") === "night-out" || content.preset === "celebration") {
    return {
      glance: false,
      actionItems: false,
      schedule: weekendBlocks.schedule,
      activities: weekendBlocks.activities,
      lodging: weekendBlocks.lodging,
      packing: weekendBlocks.packing,
      rsvp: true,
    };
  }
  return weekendBlocks;
}

export function guestRsvpExtras(content: PartyContent): {
  flights: boolean;
  food: boolean;
  votes: boolean;
  notes: boolean;
} {
  if ((content.preset ?? "weekend") === "night-out") {
    return { flights: false, food: false, votes: false, notes: false };
  }
  if (content.preset === "celebration") {
    return {
      flights: showFlightFields(content),
      food: false,
      votes: pollActivities(content).length > 0,
      notes: false,
    };
  }
  return {
    flights: showFlightFields(content),
    food: false,
    votes: pollActivities(content).length > 0,
    notes: false,
  };
}
