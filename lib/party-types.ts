// Shapes for party content stored in the database (parties.content jsonb).
// The repo ships no real party data — see README for seeding.

export type Trip = {
  groomName: string;
  siteName: string; // e.g. "Alex's Big Send" — shown in nav + hero
  tagline: string;
  startDate: string; // ISO date
  endDate: string;
  dateLabel: string; // human form, e.g. "Sep 4–7, 2026"
  location: string;
  coordinates: string;
  elevation: string;
  airport: string;
};

export type Lodging = {
  name: string;
  url: string;
  address: string;
  mapsUrl: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  totalCost: string;
  amenities: string[];
  driveFromAirport: string;
};

export type ScheduleEntry = {
  time?: string; // omit when timing is still loose
  title: string;
  note?: string;
  marquee?: boolean; // gets the ember highlight
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

export type PartyContent = {
  trip: Trip;
  lodging: Lodging;
  schedule: ScheduleDay[];
  activities: {
    core: Activity[];
    ifTimeAllows: Activity[];
    backups: Activity[];
  };
  actionItems: ActionItem[]; // the "do your part" list
};

// The maybes the guests vote on in the RSVP form (core are locked in).
export function pollActivities(content: PartyContent): Activity[] {
  return [...content.activities.ifTimeAllows, ...content.activities.backups];
}
