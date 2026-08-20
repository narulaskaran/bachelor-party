import { describe, it, expect } from "vitest";
import { DEMO_PARTY } from "@/lib/demo-party";
import {
  createPartySchema,
  partyContentSchema,
  updatePartySchema,
} from "@/lib/party-schema";
import { isInvertedDateRange } from "@/lib/trip-dates";

describe("partyContentSchema", () => {
  it("accepts IANA timezones and rejects abbreviations on new content", () => {
    expect(
      partyContentSchema.safeParse({ trip: { siteName: "Cabin", timezone: "America/Denver" } }).success,
    ).toBe(true);
    expect(
      partyContentSchema.safeParse({ trip: { siteName: "Cabin", timezone: "ET" } }).success,
    ).toBe(false);
  });

  it("accepts night-out and weekend presets on the same Event shape", () => {
    expect(
      partyContentSchema.safeParse({ preset: "night-out", trip: { siteName: "Dinner" } }).success,
    ).toBe(true);
    expect(
      partyContentSchema.safeParse({ preset: "weekend", trip: { siteName: "Cabin" } }).success,
    ).toBe(true);
  });

  it("defaults kind to absent (read as trip) and rejects event", () => {
    expect(partyContentSchema.safeParse({ trip: { siteName: "X" } }).success).toBe(
      true,
    );
    expect(
      partyContentSchema.safeParse({ kind: "trip", trip: { siteName: "X" } }).success,
    ).toBe(true);
    expect(
      partyContentSchema.safeParse({ kind: "event", trip: { siteName: "X" } }).success,
    ).toBe(false);
  });

  it("strips legacy groomName and still accepts today's full demo JSON", () => {
    const parsed = partyContentSchema.parse({
      ...DEMO_PARTY,
      trip: { ...DEMO_PARTY.trip, groomName: "Sam" },
    } as unknown);
    expect("groomName" in parsed.trip).toBe(false);
    expect(parsed.trip.siteName).toBe(DEMO_PARTY.trip.siteName);
  });

  it("accepts the demo party as a create payload", () => {
    const parsed = createPartySchema.safeParse({
      slug: "crew-weekend",
      password: "crew-secret",
      content: DEMO_PARTY,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects reserved app-route slugs", () => {
    for (const slug of ["admin", "api", "rsvp", "schedule", "activities", "basecamp", "login", "demo"]) {
      const parsed = createPartySchema.safeParse({
        slug,
        content: { trip: { siteName: "Nope" } },
      });
      expect(parsed.success).toBe(false);
      if (parsed.success) return;
      expect(parsed.error.issues.some((i) => i.path.includes("slug"))).toBe(true);
    }
  });

  it("allows omitting slug and password on create", () => {
    const parsed = createPartySchema.safeParse({
      content: { trip: { siteName: "Jackson Hole '26" } },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts packing items and strips unknown keys so they survive the admin gate", () => {
    const parsed = partyContentSchema.parse({
      trip: { siteName: "Cabin" },
      packing: [{ title: "Government ID", note: "Wallet", extra: true }],
      mystery: "nope",
    } as unknown);
    expect(parsed.packing).toEqual([{ title: "Government ID", note: "Wallet" }]);
    expect("mystery" in parsed).toBe(false);
  });

  it("rejects packing items without a title", () => {
    const parsed = partyContentSchema.safeParse({
      trip: { siteName: "Cabin" },
      packing: [{ note: "Wallet" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts any number of key events on a day", () => {
    const parsed = partyContentSchema.safeParse({
      trip: { siteName: "Cabin" },
      schedule: [
        {
          key: "friday",
          date: "2026-09-04",
          weekday: "Friday",
          label: "Arrival",
          timed: true,
          entries: [
            { title: "A", marquee: true },
            { title: "B", marquee: true },
            { title: "C", marquee: true },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects non-HTTPS lodging links", () => {
    const parsed = partyContentSchema.safeParse({
      trip: { siteName: "Cabin" },
      lodging: { name: "Pine Lodge", url: "http://example.com" },
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((issue) => /HTTPS/i.test(issue.message))).toBe(true);
  });

  it("accepts editable RSVP copy", () => {
    const parsed = partyContentSchema.safeParse({
      trip: { siteName: "Cabin" },
      rsvp: { heading: "Tell us you're in", description: "Share flights and food." },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an inverted start/end range", () => {
    const parsed = partyContentSchema.safeParse({
      trip: { siteName: "Cabin", startDate: "2026-12-20", endDate: "2026-12-10" },
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((i) => i.path.includes("endDate"))).toBe(true);
    expect(parsed.error.issues.some((i) => /before start date/i.test(i.message))).toBe(true);
  });

  it("accepts same-day start and end, a single date, and omitted dates", () => {
    expect(
      partyContentSchema.safeParse({
        trip: { siteName: "Cabin", startDate: "2026-12-20", endDate: "2026-12-20" },
      }).success,
    ).toBe(true);
    expect(
      partyContentSchema.safeParse({
        trip: { siteName: "Cabin", startDate: "2026-12-20" },
      }).success,
    ).toBe(true);
    expect(
      partyContentSchema.safeParse({
        trip: { siteName: "Cabin", endDate: "2026-12-10" },
      }).success,
    ).toBe(true);
    expect(
      partyContentSchema.safeParse({
        trip: { siteName: "Cabin" },
      }).success,
    ).toBe(true);
  });

  it.each(["2026-02-30", "2026-13-01", "2026-00-10", "2026-1-10"])(
    "rejects impossible calendar date %s",
    (date) => {
      const parsed = partyContentSchema.safeParse({
        trip: { siteName: "Cabin", startDate: date },
      });
      expect(parsed.success).toBe(false);
    },
  );

  it("rejects impossible schedule calendar dates", () => {
    const parsed = partyContentSchema.safeParse({
      trip: { siteName: "Cabin" },
      schedule: [
        {
          key: "sunday",
          date: "2026-02-30",
          weekday: "Sunday",
          label: "Impossible",
          timed: false,
          entries: [{ title: "Nope" }],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("updatePartySchema", () => {
  it("accepts a JSON Merge Patch fragment, not only a full PartyContent", () => {
    const parsed = updatePartySchema.safeParse({
      content: { schedule: [{ key: "saturday" }] },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("isInvertedDateRange", () => {
  it("is true only when both dates are set and end is before start", () => {
    expect(isInvertedDateRange("2026-12-20", "2026-12-10")).toBe(true);
    expect(isInvertedDateRange("2026-12-20", "2026-12-20")).toBe(false);
    expect(isInvertedDateRange("2026-12-20", "2026-12-21")).toBe(false);
    expect(isInvertedDateRange("2026-12-20", undefined)).toBe(false);
    expect(isInvertedDateRange(undefined, "2026-12-10")).toBe(false);
    expect(isInvertedDateRange("  ", "2026-12-10")).toBe(false);
    expect(isInvertedDateRange(undefined, undefined)).toBe(false);
  });
});
