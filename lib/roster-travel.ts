export type RosterTravel = {
  arrivalFlight?: string | null;
  arrivalTime?: string | null;
  departureFlight?: string | null;
  departureTime?: string | null;
};

function joinTravel(
  kind: "Arrival" | "Departure",
  flight?: string | null,
  time?: string | null,
): string | null {
  const parts = [flight, time].map((value) => value?.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return `${kind} · ${parts.join(" · ")}`;
}

/** Lines to show on a roster card when the trip collects flights. */
export function rosterTravelLines(guest: RosterTravel): string[] {
  const arrival = joinTravel("Arrival", guest.arrivalFlight, guest.arrivalTime);
  const departure = joinTravel(
    "Departure",
    guest.departureFlight,
    guest.departureTime,
  );
  if (!arrival && !departure) return ["Driving"];
  return [arrival, departure].filter((line): line is string => Boolean(line));
}
