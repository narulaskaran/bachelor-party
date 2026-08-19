import { describe, expect, it } from "vitest";
import {
  guestVisibleRoster,
  organizerVisibleRoster,
} from "@/lib/roster-visibility";

const guest = {
  id: 7,
  name: "Mina",
  phone: "555-0100",
  arrivalFlight: "UA 1523",
  arrivalTime: "Fri 10:45 AM",
  departureFlight: "UA 887",
  departureTime: "Mon 3:15 PM",
  dietary: "Vegetarian, no nuts",
  notes: "Landing late",
  activityPrefs: { rafting: "hyped" },
};

describe("roster visibility", () => {
  it("shows invite holders names only", () => {
    expect(guestVisibleRoster([guest])).toEqual([{ id: 7, name: "Mina" }]);
  });

  it("shows organizers the full travel and dietary details", () => {
    expect(organizerVisibleRoster([guest])).toEqual([
      {
        id: 7,
        name: "Mina",
        arrivalFlight: "UA 1523",
        arrivalTime: "Fri 10:45 AM",
        departureFlight: "UA 887",
        departureTime: "Mon 3:15 PM",
        dietary: "Vegetarian, no nuts",
      },
    ]);
  });
});