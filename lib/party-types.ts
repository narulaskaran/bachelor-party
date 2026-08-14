// Shapes for trip content stored in the database (parties.content jsonb).
// The repo ships no real trip data — hosts create trips from the site
// (README); agents seed via the API/CLI in docs/api.md.
// Legacy rows may still contain `groomName`; it is ignored on read.

export type TripKind = "trip";

export type Trip = {
  siteName: string; // e.g. "Jackson Hole '26" — shown in nav + hero
  tagline?: string;
  startDate?: string; // ISO date
  endDate?: string;
  dateLabel?: string; // human form, e.g. "Sep 4–7, 2026"
  location?: string;
  coordinates?: string;
  elevation?: string;
  airport?: string;
};

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
  marquee?: boolean; // gets the primary highlight
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

export type Activities = {
  core?: Activity[];
  ifTimeAllows?: Activity[];
  backups?: Activity[];
};

export type PartyContent = {
  kind?: TripKind;
  trip: Trip;
  lodging?: Lodging;
  schedule?: ScheduleDay[];
  activities?: Activities;
  actionItems?: ActionItem[];
};

// The maybes the guests vote on in the RSVP form (core are locked in).
export function pollActivities(content: PartyContent): Activity[] {
  const activities = content.activities;
  if (!activities) return [];
  return [...(activities.ifTimeAllows ?? []), ...(activities.backups ?? [])];
}
