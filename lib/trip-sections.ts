import { type Lodging, type PartyContent, type Trip } from "@/lib/party-types";

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
  rsvp: boolean;
};

export function hasLodging(content: PartyContent): boolean {
  return Boolean(content.lodging?.name);
}

export function showFlightFields(content: PartyContent): boolean {
  return Boolean(content.trip.airport);
}

export function hasActivities(content: PartyContent): boolean {
  const a = content.activities;
  if (!a) return false;
  return (
    (a.core?.length ?? 0) > 0 ||
    (a.ifTimeAllows?.length ?? 0) > 0 ||
    (a.backups?.length ?? 0) > 0
  );
}

export function heroMeta(trip: Trip): string[] {
  return [trip.coordinates, trip.elevation, trip.dateLabel].filter(
    (part): part is string => Boolean(part),
  );
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
          lodging.bathrooms != null ? `${lodging.bathrooms} baths` : undefined,
      });
    }
    if (lodging.totalCost) {
      facts.push({
        label: "Total",
        value: lodging.totalCost,
        note: "split by headcount",
      });
    }
  }
  return facts;
}

export function lodgingSleepsLabel(lodging: Lodging): string | null {
  const parts: string[] = [];
  if (lodging.bedrooms != null) parts.push(`${lodging.bedrooms}BR`);
  if (lodging.beds != null) parts.push(`${lodging.beds} beds`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function visibleSections(content: PartyContent): VisibleSections {
  return {
    glance: glanceFacts(content.trip, content.lodging).length > 0,
    actionItems: (content.actionItems?.length ?? 0) > 0,
    schedule: (content.schedule?.length ?? 0) > 0,
    activities: hasActivities(content),
    lodging: hasLodging(content),
    rsvp: true,
  };
}
