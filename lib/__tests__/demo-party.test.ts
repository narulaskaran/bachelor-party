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
