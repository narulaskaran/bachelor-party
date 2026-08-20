import { describe, it, expect } from "vitest";
import {
  explicitClearsFromFormData,
  mergeGuestRow,
  readGuestToken,
  readScopedRsvpToken,
  rsvpCookieName,
  rsvpFieldDefaults,
  RSVP_COOKIE,
  type GuestPatch,
} from "@/lib/merge-guest";

function patch(overrides: Partial<GuestPatch> = {}): GuestPatch {
  return {
    partyId: 1,
    name: "Alex",
    nameKey: "alex",
    phone: "555-0100",
    arrivalFlight: "UA 1523",
    arrivalTime: "Fri, 10:45 AM",
    departureFlight: "UA 887",
    departureTime: "Mon, 3:15 PM",
    dietary: "nuts",
    notes: "landing late",
    activityPrefs: { rafting: "hyped" },
    ...overrides,
  };
}

describe("mergeGuestRow", () => {
  it("keeps flights, phone, and notes when only dietary is sent", () => {
    const existing = patch();
    const incoming = patch({
      phone: null,
      arrivalFlight: null,
      arrivalTime: null,
      departureFlight: null,
      departureTime: null,
      dietary: "vegetarian",
      notes: null,
      activityPrefs: {},
    });

    expect(mergeGuestRow(existing, incoming)).toMatchObject({
      name: "Alex",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      arrivalTime: "Fri, 10:45 AM",
      departureFlight: "UA 887",
      departureTime: "Mon, 3:15 PM",
      dietary: "vegetarian",
      notes: "landing late",
      activityPrefs: { rafting: "hyped" },
    });
  });

  it("overlays a new vote without dropping other votes", () => {
    const existing = patch({ activityPrefs: { rafting: "hyped", hike: "pass" } });
    const incoming = patch({
      phone: null,
      arrivalFlight: null,
      arrivalTime: null,
      departureFlight: null,
      departureTime: null,
      dietary: null,
      notes: null,
      activityPrefs: { hike: "fine" },
    });

    expect(mergeGuestRow(existing, incoming).activityPrefs).toEqual({
      rafting: "hyped",
      hike: "fine",
    });
  });

  it("clears a field only when the client marks it as previously filled", () => {
    const existing = patch();
    const incoming = patch({ phone: null, notes: "still landing late" });
    const merged = mergeGuestRow(existing, incoming, new Set(["phone"]));
    expect(merged.phone).toBeNull();
    expect(merged.arrivalFlight).toBe("UA 1523");
    expect(merged.notes).toBe("still landing late");
  });

  it("uses incoming values as-is for a new guest", () => {
    const incoming = patch({ phone: null, notes: null });
    expect(mergeGuestRow(null, incoming)).toEqual(incoming);
  });
});

describe("explicitClearsFromFormData", () => {
  it("treats an emptied prefilled field as an explicit clear", () => {
    const formData = new FormData();
    formData.set("name", "Alex");
    formData.set("had:phone", "1");
    formData.set("phone", "  ");
    formData.set("had:notes", "1");
    formData.set("notes", "keep me");

    expect([...explicitClearsFromFormData(formData)]).toEqual(["phone"]);
  });

  it("still clears when the guest edits their own display name", () => {
    const formData = new FormData();
    formData.set("name", "Sam");
    formData.set("had:phone", "1");
    formData.set("phone", "");

    expect([...explicitClearsFromFormData(formData)]).toEqual(["phone"]);
  });
});

describe("form prefills existing data", () => {
  it("maps a saved row onto input default values", () => {
    expect(
      rsvpFieldDefaults({
        name: "Alex",
        nameKey: "alex",
        phone: "555-0100",
        arrivalFlight: "UA 1523",
        arrivalTime: "Fri, 10:45 AM",
        departureFlight: "UA 887",
        departureTime: "Mon, 3:15 PM",
        dietary: "vegetarian",
        notes: "landing late",
        activityPrefs: { rafting: "hyped" },
      }),
    ).toEqual({
      name: "Alex",
      attendanceStatus: "attending",
      partySize: 1,
      plusOneName: "",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      arrivalTime: "Fri, 10:45 AM",
      departureFlight: "UA 887",
      departureTime: "Mon, 3:15 PM",
      dietary: "vegetarian",
      notes: "landing late",
      activityPrefs: { rafting: "hyped" },
    });
  });

  it("returns empty defaults when nothing is saved for this session", () => {
    expect(rsvpFieldDefaults(null).name).toBe("");
    expect(rsvpFieldDefaults(null).phone).toBe("");
    expect(rsvpFieldDefaults(undefined).activityPrefs).toEqual({});
  });
});

describe("readGuestToken", () => {
  it("accepts 32-char hex and rejects leftover name cookies", () => {
    expect(readGuestToken("a".repeat(32))).toBe("a".repeat(32));
    expect(readGuestToken("A".repeat(32))).toBe("a".repeat(32));
    expect(readGuestToken("qa guest")).toBeNull();
    expect(readGuestToken("alex")).toBeNull();
    expect(readGuestToken("")).toBeNull();
  });
});

describe("per-event RSVP cookies", () => {
  it("names identity storage after the trip, not a global last-name cookie", () => {
    expect(rsvpCookieName(12)).toBe("bp_rsvp_12");
    expect(rsvpCookieName(12)).not.toBe(RSVP_COOKIE);
  });

  it("reads only the cookie for this trip", () => {
    const tokenA = "a".repeat(32);
    const tokenB = "b".repeat(32);
    const store = {
      get: (name: string) => {
        if (name === RSVP_COOKIE) return { value: tokenA };
        if (name === rsvpCookieName(2)) return { value: tokenB };
        return undefined;
      },
    };
    expect(readScopedRsvpToken(store, 2)).toBe(tokenB);
    expect(readScopedRsvpToken(store, 1)).toBeNull();
  });
});
