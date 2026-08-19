export type RosterGuest = {
  id: number;
  name: string;
  phone?: string | null;
  arrivalFlight?: string | null;
  arrivalTime?: string | null;
  departureFlight?: string | null;
  departureTime?: string | null;
  dietary?: string | null;
  notes?: string | null;
  activityPrefs?: Record<string, string> | null;
};

export type GuestVisibleRosterEntry = Pick<RosterGuest, "id" | "name">;

export type OrganizerVisibleRosterEntry = Pick<
  RosterGuest,
  | "id"
  | "name"
  | "arrivalFlight"
  | "arrivalTime"
  | "departureFlight"
  | "departureTime"
  | "dietary"
>;

/** The shared trip page exposes names only to invite holders. */
export function guestVisibleRoster(
  guests: RosterGuest[],
): GuestVisibleRosterEntry[] {
  return guests.map(({ id, name }) => ({ id, name }));
}

/** The organizer view may expose flight and dietary details. */
export function organizerVisibleRoster(
  guests: RosterGuest[],
): OrganizerVisibleRosterEntry[] {
  return guests.map(
    ({
      id,
      name,
      arrivalFlight,
      arrivalTime,
      departureFlight,
      departureTime,
      dietary,
    }) => ({
      id,
      name,
      arrivalFlight,
      arrivalTime,
      departureFlight,
      departureTime,
      dietary,
    }),
  );
}
