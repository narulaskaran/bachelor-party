import { describe, expect, it } from "vitest";
import {
  plusOneAllowed,
  parseRsvpSubmission,
  rsvpMaxPartySize,
  summarizeRsvps,
  type RsvpConfig,
} from "@/lib/rsvp-contract";

describe("RSVP readiness contract", () => {
  const plusOnesAllowed: RsvpConfig = { plusOnePolicy: "allowed", maxPartySize: 4 };

  it("accepts an optional plus-one count without inventing a headcount", () => {
    expect(parseRsvpSubmission({ attendance: "attending", plusOneCount: "0" }, plusOnesAllowed)).toEqual({
      ok: true,
      value: { attendanceStatus: "attending", partySize: 1, plusOneName: null },
    });
    expect(parseRsvpSubmission({ attendance: "attending", plusOneCount: "1", plusOneName: "Taylor" }, plusOnesAllowed)).toEqual({
      ok: true,
      value: { attendanceStatus: "attending", partySize: 2, plusOneName: "Taylor" },
    });
    expect(parseRsvpSubmission({ attendance: "attending", plusOneCount: "1" })).toEqual({
      ok: false,
      error: "This trip does not allow plus-ones.",
    });
  });

  it("accepts each explicit attendance state and a party size", () => {
    expect(parseRsvpSubmission({ attendance: "attending", partySize: "2" }, plusOnesAllowed)).toEqual({
      ok: true,
      value: { attendanceStatus: "attending", partySize: 2, plusOneName: null },
    });
    expect(parseRsvpSubmission({ attendance: "maybe", partySize: "1" }, plusOnesAllowed)).toEqual({
      ok: true,
      value: { attendanceStatus: "maybe", partySize: 1, plusOneName: null },
    });
    expect(parseRsvpSubmission({ attendance: "not-attending", partySize: "0" }, plusOnesAllowed)).toEqual({
      ok: true,
      value: { attendanceStatus: "not-attending", partySize: 0, plusOneName: null },
    });
  });

  it("rejects a plus-one when the party policy does not allow one", () => {
    expect(parseRsvpSubmission({ attendance: "attending", partySize: "2" })).toEqual({
      ok: false,
      error: "This trip does not allow plus-ones.",
    });
  });

  it("rejects malformed attendance and party-size boundaries", () => {
    expect(parseRsvpSubmission({ attendance: "unknown", partySize: "1" })).toMatchObject({ ok: false });
    expect(parseRsvpSubmission({ attendance: "attending", partySize: "0" })).toEqual({
      ok: false,
      error: "Attending guests must include at least one person.",
    });
    expect(parseRsvpSubmission({ attendance: "attending", partySize: "5" }, { plusOnePolicy: "allowed", maxPartySize: 4 })).toEqual({
      ok: false,
      error: "Party size cannot exceed 4.",
    });
  });

  it("does not let a compatibility flag override an explicit not-allowed policy", () => {
    expect(parseRsvpSubmission({ attendance: "attending", partySize: "2" }, {
      plusOnePolicy: "not-allowed",
      allowPlusOne: true,
    })).toEqual({ ok: false, error: "This trip does not allow plus-ones." });
    expect(plusOneAllowed({ plusOnePolicy: "not-allowed", allowPlusOne: true })).toBe(false);
    expect(plusOneAllowed({ plusOnePolicy: "allowed" })).toBe(true);
    expect(plusOneAllowed({ allowPlusOne: true })).toBe(true);
    expect(plusOneAllowed({})).toBe(false);
  });

  it("clamps party size to the same bounds the RSVP form uses", () => {
    expect(rsvpMaxPartySize()).toBe(10);
    expect(rsvpMaxPartySize({ maxPartySize: 4 })).toBe(4);
    expect(rsvpMaxPartySize({ maxPartySize: 0 })).toBe(1);
    expect(rsvpMaxPartySize({ maxPartySize: 99 })).toBe(20);
  });

  it("clears stale plus-one data when a response becomes not-attending", () => {
    expect(parseRsvpSubmission({ attendance: "not-attending", partySize: "0", plusOneName: "Taylor" }, {
      plusOnePolicy: "allowed",
    })).toEqual({
      ok: true,
      value: { attendanceStatus: "not-attending", partySize: 0, plusOneName: null },
    });
  });

  it("accepts and normalizes a named plus-one under an explicit allow policy", () => {
    expect(
      parseRsvpSubmission(
        { attendance: "attending", partySize: "2", plusOneName: "  Taylor  " },
        plusOnesAllowed,
      ),
    ).toEqual({
      ok: true,
      value: { attendanceStatus: "attending", partySize: 2, plusOneName: "Taylor" },
    });
  });

  it("summarizes private organizer counts without changing guest-facing data", () => {
    expect(
      summarizeRsvps([
        { attendanceStatus: "attending", partySize: 2 },
        { attendanceStatus: "attending", partySize: 1 },
        { attendanceStatus: "maybe", partySize: 1 },
        { attendanceStatus: "not-attending", partySize: 0 },
      ]),
    ).toEqual({
      responses: 4,
      attending: 2,
      maybe: 1,
      notAttending: 1,
      expectedPeople: 4,
    });
  });
});
