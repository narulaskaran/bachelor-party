import { describe, it, expect } from "vitest";
import { DEMO_PARTY } from "@/lib/demo-party";
import { createPartySchema, partyContentSchema } from "@/lib/party-schema";

describe("partyContentSchema", () => {
  it("accepts siteName-only content", () => {
    const parsed = partyContentSchema.safeParse({
      trip: { siteName: "Jackson Hole '26" },
    });
    expect(parsed.success).toBe(true);
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
      slug: "demo",
      password: "crew-secret",
      content: DEMO_PARTY,
    });
    expect(parsed.success).toBe(true);
  });
});
