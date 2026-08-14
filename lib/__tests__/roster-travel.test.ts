import { describe, expect, it } from "vitest";
import { rosterTravelLines } from "@/lib/roster-travel";

describe("rosterTravelLines", () => {
  it("says Driving when arrival and departure are empty", () => {
    expect(rosterTravelLines({})).toEqual(["Driving"]);
    expect(
      rosterTravelLines({
        arrivalFlight: "",
        arrivalTime: "  ",
        departureFlight: null,
        departureTime: undefined,
      }),
    ).toEqual(["Driving"]);
  });

  it("does not print em dashes for missing flight fields", () => {
    expect(
      rosterTravelLines({ arrivalFlight: "UA 1523", arrivalTime: "" }),
    ).toEqual(["Arrival · UA 1523"]);
    expect(
      rosterTravelLines({
        arrivalFlight: "UA 1523",
        arrivalTime: "Fri 10:45 AM",
        departureFlight: "UA 887",
        departureTime: "Mon 3:15 PM",
      }),
    ).toEqual(["Arrival · UA 1523 · Fri 10:45 AM", "Departure · UA 887 · Mon 3:15 PM"]);
  });
});
