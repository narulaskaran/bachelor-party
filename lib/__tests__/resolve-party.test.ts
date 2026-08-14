import { afterEach, describe, expect, it } from "vitest";
import { DEMO_PARTY } from "@/lib/demo-party";
import { resolvePartyBySlug } from "@/lib/resolve-party";
import { createMemoryDb } from "@/test/api/memory-db";

function dbOf(mem: ReturnType<typeof createMemoryDb>) {
  return mem.db as never;
}

describe("resolvePartyBySlug", () => {
  const originalPassword = process.env.PARTY_PASSWORD;

  afterEach(() => {
    if (originalPassword === undefined) delete process.env.PARTY_PASSWORD;
    else process.env.PARTY_PASSWORD = originalPassword;
  });

  it("serves the Alpine Weekend fixture for /demo when a DB is configured but has no demo row", async () => {
    delete process.env.PARTY_PASSWORD;
    const mem = createMemoryDb();
    mem.seedParty({ slug: "jackson-hole-26", password: "crew-secret" });

    const resolved = await resolvePartyBySlug("demo", dbOf(mem));

    expect(resolved).toEqual({ status: "open", content: DEMO_PARTY });
    expect(resolved.status === "open" && resolved.content.trip.siteName).toBe(
      "Alpine Weekend",
    );
  });

  it("does not 404 /demo when the database exists and is empty", async () => {
    const mem = createMemoryDb();
    const resolved = await resolvePartyBySlug("demo", dbOf(mem));
    expect(resolved.status).toBe("open");
    if (resolved.status !== "open") return;
    expect(resolved.content.trip.siteName).toBe("Alpine Weekend");
    expect(resolved.content.trip.location).toBe("Alpine Meadows, CO");
  });

  it("still 404s unknown slugs when a DB is configured and the row is missing", async () => {
    const mem = createMemoryDb();
    const resolved = await resolvePartyBySlug("not-a-trip", dbOf(mem));
    expect(resolved).toEqual({ status: "missing" });
  });

  it("does not replace a real trip with the demo fixture", async () => {
    const mem = createMemoryDb();
    const content = { kind: "trip" as const, trip: { siteName: "Jackson Hole '26" } };
    mem.seedParty({
      id: 7,
      slug: "jackson-hole-26",
      password: "crew-secret",
      content,
    });

    const resolved = await resolvePartyBySlug("jackson-hole-26", dbOf(mem));

    expect(resolved).toEqual({
      status: "gated",
      id: 7,
      password: "crew-secret",
      content,
    });
  });

  it("uses a real demo row when one exists instead of the fixture", async () => {
    const mem = createMemoryDb();
    const content = { kind: "trip" as const, trip: { siteName: "Seeded Demo" } };
    mem.seedParty({
      id: 3,
      slug: "demo",
      password: "packet-password",
      content,
    });

    const resolved = await resolvePartyBySlug("demo", dbOf(mem));

    expect(resolved).toEqual({
      status: "gated",
      id: 3,
      password: "packet-password",
      content,
    });
  });

  it("serves the open fixture with no database and no PARTY_PASSWORD", async () => {
    delete process.env.PARTY_PASSWORD;
    const resolved = await resolvePartyBySlug("demo", null);
    expect(resolved).toEqual({ status: "open", content: DEMO_PARTY });
  });

  it("gates the no-DB fixture with PARTY_PASSWORD", async () => {
    process.env.PARTY_PASSWORD = "test123";
    const resolved = await resolvePartyBySlug("demo", null);
    expect(resolved).toEqual({
      status: "gated",
      id: "demo",
      password: "test123",
      content: DEMO_PARTY,
    });
  });

  it("404s other slugs in no-DB mode", async () => {
    const resolved = await resolvePartyBySlug("jackson-hole-26", null);
    expect(resolved).toEqual({ status: "missing" });
  });

  it("ignores PARTY_PASSWORD and stays open when a DB is configured but has no demo row", async () => {
    process.env.PARTY_PASSWORD = "local-only-gate";
    const mem = createMemoryDb();
    const resolved = await resolvePartyBySlug("demo", dbOf(mem));
    expect(resolved.status).toBe("open");
    if (resolved.status !== "open") return;
    expect(resolved.content.trip.siteName).toBe("Alpine Weekend");
  });
});
