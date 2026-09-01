// Shapes for Event content stored in the database (parties.content jsonb).
// The human-facing aggregate is Event. The stored `trip` key and `kind: "trip"`
// stay for existing rows, the admin API, and CLI — do not treat those as a
// second product. Hosts create events from the site (README); agents can still
// seed via the API/CLI in docs/api.md.
// Legacy rows may still contain `groomName`; it is ignored on read.

export type TripKind = "trip";
export type EventPreset = "night-out" | "weekend";

export type GuestUpdate = {
  at: string;
  fields: string[];
};

export type DraftFactStatus = "confirmed" | "extracted" | "inferred" | "missing" | "stale";

export type DraftFact = {
  path: string;
  label: string;
  status: DraftFactStatus;
  value?: string;
  note?: string;
  source?: string;
};

export type DraftReview = {
  acknowledged: boolean;
  sourcePlan?: string;
  facts: DraftFact[];
};

export type Trip = {
  siteName: string; // e.g. "Jackson Hole '26" — shown in nav + hero
  tagline?: string;
  startDate?: string; // ISO date
  endDate?: string;
  dateLabel?: string; // human form, e.g. "Sep 4–7, 2026"
  location?: string;
  address?: string;
  mapsUrl?: string;
  timezone?: string;
  /** Optional clock time, e.g. "19:00" or "7:00 PM". Shown only with a real IANA zone. */
  startTime?: string;
  coordinates?: string;
  elevation?: string;
  airport?: string;
};

/** Preview/header fallback when the live editor title is empty. Save can still require a name. */
export const UNTITLED_EVENT_TITLE = "Untitled event";

/** Stated name for review facts. The crash-guard display placeholder is not a fact. */
export function statedEventTitle(name: string | undefined): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed || trimmed === UNTITLED_EVENT_TITLE) return undefined;
  return trimmed;
}

export function eventTitleOrFallback(name: string | undefined): string {
  return statedEventTitle(name) ?? UNTITLED_EVENT_TITLE;
}

export type Lodging = {
  name: string;
  url?: string;
  address?: string;
  mapsUrl?: string;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  totalCost?: string;
  amenities?: string[];
  driveFromAirport?: string;
};

export type ScheduleEntry = {
  time?: string; // omit when timing is still loose
  title: string;
  note?: string;
  marquee?: boolean; // key event — emphasized on the guest timeline
};

export type ScheduleDay = {
  key: string;
  date: string;
  weekday: string;
  label: string;
  timed: boolean; // false = ordered plan, times TBD
  entries: ScheduleEntry[];
};

export type Activity = {
  slug: string;
  name: string;
  description?: string;
  options?: { label: string; url?: string }[];
};

export type ActionItem = {
  title: string; // short imperative, e.g. "Book your flight"
  note?: string; // one-line detail
  anchor?: string; // in-page anchor like "#rsvp"
};

export type PackingItem = {
  title: string; // short name, e.g. "Government ID"
  note?: string; // one-line detail
};

export type Activities = {
  core?: Activity[];
  ifTimeAllows?: Activity[];
  backups?: Activity[];
};

export type RsvpConfig = {
  heading?: string;
  description?: string;
  plusOnePolicy?: "not-allowed" | "allowed";
  /** Backward-compatible shorthand for hosts configuring JSON directly. */
  allowPlusOne?: boolean;
  maxPartySize?: number;
};

export type PartyContent = {
  kind?: TripKind;
  /** Party (details + RSVP) or group trip (optional schedule/lodge/activities/pack). */
  preset?: EventPreset;
  trip: Trip;
  presentation?: { style: "clean" | "editorial" };
  draftReview?: DraftReview;
  /** Set when a published event's guest-visible logistics change. Does not reset RSVPs. */
  guestUpdate?: GuestUpdate;
  rsvp?: RsvpConfig;
  lodging?: Lodging;
  schedule?: ScheduleDay[];
  activities?: Activities;
  actionItems?: ActionItem[];
  packing?: PackingItem[];
};

// The maybes the guests vote on in the RSVP form (core are locked in).
export function pollActivities(content: PartyContent): Activity[] {
  const activities = content.activities;
  if (!activities) return [];
  return [...(activities.ifTimeAllows ?? []), ...(activities.backups ?? [])];
}
