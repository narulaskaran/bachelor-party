import { describe, expect, it } from "vitest";
import { DEMO_PARTY } from "@/lib/demo-party";

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
