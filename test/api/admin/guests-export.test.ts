import { describe, it, expect, afterEach, vi } from "vitest";
import { GET as exportGET } from "@/app/api/admin/trips/[slug]/guests/export/route";
import { guestsToCsv, activityVotesCell } from "@/lib/roster-csv";
import { getDb } from "@/lib/db";
import type { Guest } from "@/lib/db/schema";
import { createMemoryDb } from "../memory-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

function makeRequest(token: string | null, slug = "cabin"): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request(`http://localhost/api/admin/trips/${slug}/guests/export`, {
    method: "GET",
    headers,
  });
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("GET /api/admin/trips/:slug/guests/export (P2-2 organizer CSV)", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("401s without a bearer token", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "cabin", adminToken: "cabin-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await exportGET(makeRequest(null), ctx("cabin"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Missing bearer token" });
  });

  it("401s a guest token — invite holders can never pull the full roster", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", adminToken: "cabin-tok", password: "letmein-77" });
    const guest = mem.seedGuest({
      partyId: party.id,
      guestToken: "guest-secret-token",
      name: "Alex Rivers",
      phone: "555-0100",
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    // Guest bearer token...
    const byGuestToken = await exportGET(makeRequest(guest.guestToken as string), ctx("cabin"));
    expect(byGuestToken.status).toBe(401);
    const body = await byGuestToken.text();
    expect(JSON.parse(body)).toEqual({ error: "Invalid token" });
    expect(body).not.toContain("Alex Rivers");
    expect(body).not.toContain("555-0100");

    // ...and the trip's shared guest password are both rejected.
    const byPassword = await exportGET(makeRequest(party.password as string), ctx("cabin"));
    expect(byPassword.status).toBe(401);
  });

  it("401s another trip's admin token", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "alpha", adminToken: "alpha-tok" });
    mem.seedParty({ slug: "beta", adminToken: "beta-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await exportGET(makeRequest("alpha-tok", "beta"), ctx("beta"));
    expect(res.status).toBe(401);
  });

  it("returns the full-detail roster as a downloadable CSV", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", adminToken: "cabin-tok", password: "trip-pw-1" });
    mem.seedGuest({ partyId: party.id, name: "Alice Example", nameKey: "alice example" });
    mem.seedGuest({
      partyId: party.id,
      name: "Jane Doe",
      nameKey: "jane doe",
      attendanceStatus: "maybe",
      partySize: 2,
      plusOneName: "John Smith",
      phone: "555-0123",
      arrivalFlight: "UA 123",
      arrivalTime: "2026-09-04 3:10 PM",
      departureFlight: "UA 456",
      departureTime: "2026-09-07 9:00 AM",
      dietary: "Vegetarian",
      activityPrefs: { rafting: "hyped", "hot-springs": "pass" },
      notes: "Prefers window seat",
      guestToken: "aaaa-guest-token-should-not-leak",
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await exportGET(makeRequest("cabin-tok"), ctx("cabin"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="cabin-guest-roster.csv"',
    );

    const csv = await res.text();
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0]).toBe(
      [
        "Name",
        "RSVP",
        "Party Size",
        "Plus One",
        "Phone",
        "Arrival Flight",
        "Arrival Time",
        "Departure Flight",
        "Departure Time",
        "Dietary",
        "Activity Votes",
        "Notes",
      ].join(","),
    );
    // Ordered by name.
    expect(lines[1].startsWith("Alice Example,")).toBe(true);
    expect(lines[2]).toContain("Jane Doe");
    expect(lines[2]).toContain("555-0123");
    expect(lines[2]).toContain("UA 123");
    expect(lines[2]).toContain("2026-09-04 3:10 PM");
    expect(lines[2]).toContain("Vegetarian");
    expect(lines[2]).toContain("rafting: hyped; hot-springs: pass");
    expect(lines[2]).toContain("Prefers window seat");

    // Privacy contract: no secrets in the payload, ever.
    expect(csv).not.toContain("aaaa-guest-token-should-not-leak");
    expect(csv).not.toContain("cabin-tok");
    expect(csv).not.toContain("trip-pw-1");
    expect(csv.toLowerCase()).not.toContain("guesttoken");
  });

  it("exports a headers-only CSV when the trip has no RSVPs yet", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "cabin", adminToken: "cabin-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await exportGET(makeRequest("cabin-tok"), ctx("cabin"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    const csv = await res.text();
    expect(csv.trimEnd().split("\r\n")).toHaveLength(1);
    expect(csv).toContain("Name,RSVP,Party Size");
  });

  it("returns the JSON error envelope when the roster query fails, not an HTML 500", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "cabin", adminToken: "cabin-tok" });
    vi.mocked(getDb).mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: async () => {
              throw new Error("neon connection reset");
            },
          }),
        }),
      }),
    } as never);

    const res = await exportGET(makeRequest("cabin-tok"), ctx("cabin"));
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ error: "Failed to export guest roster" });
    void mem;
  });
});

describe("roster-csv escaping", () => {
  function guest(partial: Partial<Guest>): Guest {
    return {
      id: 1,
      partyId: 1,
      guestToken: "t",
      name: "X",
      nameKey: "x",
      attendanceStatus: "attending",
      partySize: 1,
      plusOneName: null,
      phone: null,
      arrivalFlight: null,
      arrivalTime: null,
      departureFlight: null,
      departureTime: null,
      dietary: null,
      activityPrefs: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    } as Guest;
  }

  it("quotes cells containing commas, quotes, or newlines per RFC 4180", () => {
    const csv = guestsToCsv([
      guest({ name: 'Doe, Jane "JD"', notes: "line1\nline2" }),
    ]);
    const dataRow = csv.split("\r\n")[1];
    expect(dataRow).toBe('"Doe, Jane ""JD""",attending,1,,,,,,,,,"line1\nline2"');
  });

  it("renders blank columns for missing optional fields and formats votes", () => {
    expect(activityVotesCell(null)).toBe("");
    expect(activityVotesCell({ rafting: "fine" })).toBe("rafting: fine");
    const csv = guestsToCsv([guest({})]);
    expect(csv.split("\r\n")[1]).toBe("X,attending,1,,,,,,,,,");
  });
});
