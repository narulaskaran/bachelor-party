export type RosterGuest = {
  id: number;
  name: string;
  attendanceStatus?: "attending" | "maybe" | "not-attending";
  partySize?: number;
  plusOneName?: string | null;
  phone?: string | null;
  arrivalFlight?: string | null;
  arrivalTime?: string | null;
  departureFlight?: string | null;
  departureTime?: string | null;
  dietary?: string | null;
  notes?: string | null;
  activityPrefs?: Record<string, string> | null;
};

export type GuestVisibleRosterEntry = Pick<RosterGuest, "id" | "name"> & {
  attendanceStatus: "attending" | "maybe";
};

export type OrganizerVisibleRosterEntry = Pick<
  RosterGuest,
  | "id"
  | "name"
  | "attendanceStatus"
  | "partySize"
  | "plusOneName"
  | "phone"
  | "arrivalFlight"
  | "arrivalTime"
  | "departureFlight"
  | "departureTime"
  | "dietary"
>;

export function guestFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Guests see first names and Yes/Maybe. No is omitted. */
export function guestVisibleRoster(
  guests: RosterGuest[],
): GuestVisibleRosterEntry[] {
  return guests.flatMap((guest) => {
    if (guest.attendanceStatus === "not-attending") return [];
    const attendanceStatus = guest.attendanceStatus === "maybe" ? "maybe" : "attending";
    return [{ id: guest.id, name: guestFirstName(guest.name), attendanceStatus }];
  });
}

/** The organizer view may expose flight and dietary details. */
export function organizerVisibleRoster(
  guests: RosterGuest[],
): OrganizerVisibleRosterEntry[] {
  return guests.map(
    ({
      id,
      name,
      attendanceStatus,
      partySize,
      plusOneName,
      phone,
      arrivalFlight,
      arrivalTime,
      departureFlight,
      departureTime,
      dietary,
    }) => ({
      id,
      name,
      ...(attendanceStatus === undefined ? {} : { attendanceStatus }),
      ...(partySize === undefined ? {} : { partySize }),
      ...(plusOneName === undefined ? {} : { plusOneName }),
      ...(phone === undefined ? {} : { phone }),
      arrivalFlight,
      arrivalTime,
      departureFlight,
      departureTime,
      dietary,
    }),
  );
}
