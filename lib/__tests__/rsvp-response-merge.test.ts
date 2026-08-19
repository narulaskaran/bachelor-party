import { describe, expect, it } from "vitest";
import { mergeGuestRow, type GuestPatch } from "@/lib/merge-guest";

const base = (overrides: Partial<GuestPatch> = {}): GuestPatch => ({
  partyId: 1,
  name: "Alex",
  nameKey: "alex",
  phone: null,
  arrivalFlight: null,
  arrivalTime: null,
  departureFlight: null,
  departureTime: null,
  dietary: null,
  notes: null,
  activityPrefs: {},
  attendanceStatus: "attending",
  partySize: 1,
  plusOneName: null,
  ...overrides,
});

describe("guest identity and RSVP response merge", () => {
  it("updates response fields without changing the browser-bound identity", () => {
    const merged = mergeGuestRow(
      base({ name: "Alex", nameKey: "alex", attendanceStatus: "maybe", partySize: 1 }),
      base({ name: "Alex Updated", nameKey: "alex updated", attendanceStatus: "attending", partySize: 2, plusOneName: "Taylor" }),
    );

    expect(merged).toMatchObject({
      partyId: 1,
      name: "Alex Updated",
      attendanceStatus: "attending",
      partySize: 2,
      plusOneName: "Taylor",
    });
  });
});
