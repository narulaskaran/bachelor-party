import { describe, expect, it } from "vitest";
import { DEMO_PARTY, DEMO_RSVP_MESSAGE } from "@/lib/demo-party";

describe("DEMO_PARTY lodging", () => {
  it("does not use example.com placeholders", () => {
    const lodging = DEMO_PARTY.lodging!;
    expect(JSON.stringify(lodging)).not.toContain("example.com");
    expect(lodging.url).toBeUndefined();
    expect(lodging.mapsUrl).toMatch(/google\.com\/maps/);
    expect(lodging.mapsUrl).toMatch(/Lodge\+Road|Lodge%20Road/);
    expect(lodging.mapsUrl).toMatch(/Alpine(\+|%20)Meadows/);
  });
});

describe("DEMO_RSVP_MESSAGE", () => {
  it("tells visitors the sample trip does not save RSVPs", () => {
    expect(DEMO_RSVP_MESSAGE).toMatch(/doesn't save RSVPs/i);
  });
});

describe("DEMO_PARTY schedule", () => {
  it("covers every date in the trip range through departure day", () => {
    const schedule = DEMO_PARTY.schedule ?? [];
    expect(schedule.at(-1)?.date).toBe(DEMO_PARTY.trip.endDate);
    expect(schedule.at(-1)?.label).toBe("Departure day");
    expect(schedule.at(-1)?.entries.map((entry) => entry.title)).toContain("Departures");
  });
});
describe("DEMO_PARTY packing", () => {
  it("lists alpine-weekend items and a Pack action-item", () => {
    expect(DEMO_PARTY.packing?.map((item) => item.title)).toEqual([
      "Government ID",
      "Layers",
      "Hiking shoes",
      "Warm jacket",
      "Sunscreen",
      "Refillable bottle",
    ]);
    expect(DEMO_PARTY.actionItems?.some((item) => item.anchor === "#pack")).toBe(true);
  });
});

describe("DEMO_PARTY action items", () => {
  it("does not give Do your part a second RSVP duration", () => {
    const rsvp = DEMO_PARTY.actionItems?.find((item) => item.anchor === "#rsvp");
    expect(rsvp?.title).toBe("RSVP below");
    expect(rsvp?.note).toBe("Flights, food, votes");
    expect(rsvp?.note).not.toMatch(/minute/i);
    expect(JSON.stringify(DEMO_PARTY.actionItems)).not.toMatch(/two minutes/i);
  });
});
