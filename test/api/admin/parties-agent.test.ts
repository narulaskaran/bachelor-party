/** Route-level tests for sparse create, merge-patch, organizer packet, guest auth. */

import { describe, it, expect, afterEach, vi } from "vitest";
import { GET as listGET, POST } from "@/app/api/admin/trips/route";
import { GET, PATCH, DELETE } from "@/app/api/admin/trips/[slug]/route";
import { GET as guestsGET } from "@/app/api/admin/trips/[slug]/guests/route";
import { DELETE as guestDELETE } from "@/app/api/admin/trips/[slug]/guests/[id]/route";
import { DEMO_PARTY } from "@/lib/demo-party";
import { getDb } from "@/lib/db";
import { CREATE_RATE_LIMIT, consumeRateLimit, createRateLimitKey, resetRateLimitStore } from "@/lib/rate-limit";
import { createMemoryDb } from "../memory-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

function makeRequest(
  token: string | null,
  init: { method?: string; body?: unknown; url?: string; ip?: string } = {},
): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  if (init.ip) headers.set("x-forwarded-for", init.ip);
  return new Request(init.url ?? "http://localhost/api/admin/parties", {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function guestCtx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

describe("agent API (create / patch / guests)", () => {
  afterEach(() => {
    delete process.env.ADMIN_API_TOKEN;
    resetRateLimitStore();
    vi.mocked(getDb).mockReset();
  });

  it("unauthenticated POST siteName-only → 201 organizer packet", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        body: { content: { trip: { siteName: "Jackson Hole '26" } } },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe("jackson-hole-26");
    expect(body.url).toBe("http://localhost/jackson-hole-26");
    expect(body.password).toEqual(expect.any(String));
    expect(body.password.length).toBeGreaterThanOrEqual(8);
    expect(body.adminToken).toEqual(expect.any(String));
    expect(body.party.slug).toBe("jackson-hole-26");
    expect(mem.parties[0].content).toMatchObject({
      kind: "trip",
      trip: { siteName: "Jackson Hole '26" },
    });
  });

  it("packet adminToken can mutate that trip", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const created = await POST(
      makeRequest(null, {
        method: "POST",
        body: { content: { trip: { siteName: "Cabin Weekend" } } },
      }),
    );
    const packet = await created.json();

    const patched = await PATCH(
      makeRequest(packet.adminToken, {
        method: "PATCH",
        body: { content: { trip: { tagline: "Let's go" } } },
      }),
      ctx(packet.slug),
    );
    expect(patched.status).toBe(200);
    const body = await patched.json();
    expect(body.trip.content.trip.tagline).toBe("Let's go");
  });

  it("packet adminToken cannot mutate another trip", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "alpha", adminToken: "alpha-tok" });
    mem.seedParty({ slug: "beta", adminToken: "beta-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const patched = await PATCH(
      makeRequest("alpha-tok", {
        method: "PATCH",
        body: { content: { trip: { siteName: "Hijack" } } },
      }),
      ctx("beta"),
    );
    expect(patched.status).toBe(401);
  });

  it("GET list with a packet token returns only that trip", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "alpha", adminToken: "alpha-tok", content: { trip: { siteName: "Alpha" } } });
    mem.seedParty({ slug: "beta", adminToken: "beta-tok", content: { trip: { siteName: "Beta" } } });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const listed = await listGET(makeRequest("alpha-tok"));
    expect(listed.status).toBe(200);
    const index = await listed.json();
    expect(index.trips).toHaveLength(1);
    expect(index.trips[0].slug).toBe("alpha");
    expect(index.parties).toEqual(index.trips);
  });

  it("GET list without a token does not leak other people's trips", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "alpha", adminToken: "alpha-tok" });
    mem.seedParty({ slug: "beta", adminToken: "beta-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const listed = await listGET(makeRequest(null));
    expect(listed.status).toBe(401);
    expect(await listed.json()).toEqual({ error: "Missing bearer token" });
  });

  it("ADMIN_API_TOKEN unset does not 503 on create", async () => {
    delete process.env.ADMIN_API_TOKEN;
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        body: { content: { trip: { siteName: "No Global" } } },
      }),
    );
    expect(res.status).toBe(201);
  });

  it("presenting ADMIN_API_TOKEN does not grant superadmin", async () => {
    process.env.ADMIN_API_TOKEN = "legacy-global";
    const mem = createMemoryDb();
    mem.seedParty({ slug: "alpha", adminToken: "alpha-tok", content: { trip: { siteName: "Alpha" } } });
    mem.seedParty({ slug: "beta", adminToken: "beta-tok", content: { trip: { siteName: "Beta" } } });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const listed = await listGET(makeRequest("legacy-global"));
    expect(listed.status).toBe(401);

    const got = await GET(makeRequest("legacy-global"), ctx("alpha"));
    expect(got.status).toBe(401);

    const patched = await PATCH(
      makeRequest("legacy-global", {
        method: "PATCH",
        body: { content: { trip: { siteName: "Hijack" } } },
      }),
      ctx("alpha"),
    );
    expect(patched.status).toBe(401);
  });

  it("rate-limits unauthenticated create per IP", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    const ip = "198.51.100.10";
    const key = createRateLimitKey(ip);
    for (let i = 0; i < CREATE_RATE_LIMIT.limit; i++) {
      consumeRateLimit(key, CREATE_RATE_LIMIT);
    }

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        ip,
        body: { content: { trip: { siteName: "Spam" } } },
      }),
    );
    expect(res.status).toBe(429);
    expect(mem.parties).toHaveLength(0);
  });

  it("POST reserved slug → 400 and does not create", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    for (const slug of ["admin", "rsvp", "demo"]) {
      const res = await POST(
        makeRequest(null, {
          method: "POST",
          body: { slug, content: { trip: { siteName: "Should not create" } } },
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.issues[0].path).toBe("slug");
      expect(body.issues[0].message).toMatch(/reserved/i);
      expect(body.issues[0].hint).toMatch(/app routes/i);
    }
    expect(mem.parties).toHaveLength(0);
  });

  it("POST autogen skips reserved names and existing trips", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "admin-2", content: { trip: { siteName: "Existing" } } });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        body: { content: { trip: { siteName: "Admin" } } },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe("admin-3");
    expect(body.url).toBe("http://localhost/admin-3");
  });

  it("POST colliding slug → 409 with hint, does not upsert", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "jackson-hole-26",
      content: { trip: { siteName: "Original" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        body: {
          slug: "jackson-hole-26",
          content: { trip: { siteName: "Should not replace" } },
        },
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.issues[0].path).toBe("slug");
    expect(body.issues[0].hint).toMatch(/PATCH/i);
    expect(mem.parties).toHaveLength(1);
    expect((mem.parties[0].content as { trip: { siteName: string } }).trip.siteName).toBe(
      "Original",
    );
  });

  it("POST kind: event → 400", async () => {
    vi.mocked(getDb).mockReturnValue(createMemoryDb().db as never);

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        body: { content: { kind: "event", trip: { siteName: "Gala" } } },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.some((i: { path: string }) => i.path.includes("kind"))).toBe(true);
  });

  it("PATCH merge-patches one schedule day without wiping lodging", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "jackson-hole-26",
      adminToken: "party-tok",
      content: {
        kind: "trip",
        trip: { siteName: "Jackson Hole '26" },
        lodging: { name: "Cabin" },
      },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await PATCH(
      makeRequest("party-tok", {
        method: "PATCH",
        url: "http://localhost/api/admin/parties/jackson-hole-26",
        body: {
          content: {
            schedule: [
              {
                key: "saturday",
                date: "2026-09-05",
                weekday: "Saturday",
                label: "Dinner",
                timed: true,
                entries: [{ title: "Dinner", time: "7:00 PM" }],
              },
            ],
          },
        },
      }),
      ctx("jackson-hole-26"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.party.content.lodging).toEqual({ name: "Cabin" });
    expect(body.party.content.schedule[0].entries[0].title).toBe("Dinner");
    expect(body.party.content.trip.siteName).toBe("Jackson Hole '26");
  });

  it("full-document PATCH still 200", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "demo", adminToken: "party-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await PATCH(
      makeRequest("party-tok", {
        method: "PATCH",
        url: "http://localhost/api/admin/parties/demo",
        body: { content: DEMO_PARTY },
      }),
      ctx("demo"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.party.content.trip.siteName).toBe(DEMO_PARTY.trip.siteName);
    expect(body.party.content.lodging.name).toBe(DEMO_PARTY.lodging?.name);
  });

  it("party token cannot GET or PATCH a different slug", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "alpha", adminToken: "alpha-tok" });
    mem.seedParty({ slug: "beta", adminToken: "beta-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const got = await GET(makeRequest("alpha-tok"), ctx("beta"));
    expect(got.status).toBe(401);

    const patched = await PATCH(
      makeRequest("alpha-tok", {
        method: "PATCH",
        body: { content: { trip: { siteName: "Hijack" } } },
      }),
      ctx("beta"),
    );
    expect(patched.status).toBe(401);
  });

  it("walkthrough: create sparse → merge-patch dinner → GET → guests []", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const created = await POST(
      makeRequest(null, {
        method: "POST",
        body: { content: { trip: { siteName: "Jackson Hole '26" } } },
      }),
    );
    expect(created.status).toBe(201);
    const packet = await created.json();
    const token = packet.adminToken as string;
    const slug = packet.slug as string;

    const patched = await PATCH(
      makeRequest(token, {
        method: "PATCH",
        url: `http://localhost/api/admin/parties/${slug}`,
        body: {
          content: {
            schedule: [
              {
                key: "saturday",
                date: "2026-09-05",
                weekday: "Saturday",
                label: "Dinner",
                timed: true,
                entries: [{ title: "Saturday dinner", time: "7:00 PM" }],
              },
            ],
          },
        },
      }),
      ctx(slug),
    );
    expect(patched.status).toBe(200);

    const got = await GET(makeRequest(token), ctx(slug));
    expect(got.status).toBe(200);
    const record = await got.json();
    expect(record.party.content.trip.siteName).toBe("Jackson Hole '26");
    expect(record.party.content.lodging).toBeUndefined();
    expect(record.party.content.schedule[0].entries[0].title).toBe("Saturday dinner");

    const guests = await guestsGET(makeRequest(token), ctx(slug));
    expect(guests.status).toBe(200);
    expect(await guests.json()).toEqual({ guests: [] });
  });

  it("GET guests and DELETE guest work with the party token", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", adminToken: "cabin-tok" });
    mem.seedGuest({ partyId: party.id, name: "Alex", nameKey: "alex" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const listed = await guestsGET(makeRequest("cabin-tok"), ctx("cabin"));
    expect(listed.status).toBe(200);
    const body = await listed.json();
    expect(body.guests).toHaveLength(1);
    expect(body.guests[0].name).toBe("Alex");

    const deleted = await guestDELETE(
      makeRequest("cabin-tok"),
      guestCtx("cabin", String(body.guests[0].id)),
    );
    expect(deleted.status).toBe(200);
    expect(mem.guests).toHaveLength(0);
  });

  it("party token cannot list another slug's guests", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "alpha", adminToken: "alpha-tok" });
    mem.seedParty({ slug: "beta", adminToken: "beta-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await guestsGET(makeRequest("alpha-tok"), ctx("beta"));
    expect(res.status).toBe(401);
  });

  it("party token can delete its own trip", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "cabin", adminToken: "cabin-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await DELETE(makeRequest("cabin-tok"), ctx("cabin"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: "cabin" });
    expect(mem.parties).toHaveLength(0);
  });

  it("POST invalid JSON → 400 with a structured issue", async () => {
    vi.mocked(getDb).mockReturnValue(createMemoryDb().db as never);
    const headers = new Headers();
    headers.set("content-type", "application/json");
    const res = await POST(
      new Request("http://localhost/api/admin/trips", {
        method: "POST",
        headers,
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
    expect(body.issues[0].path).toBe("(root)");
  });

  it("PATCH with no bearer → 401 and no Zod issues", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "foo", adminToken: "real-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await PATCH(
      makeRequest(null, { method: "PATCH", body: {} }),
      ctx("foo"),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.issues).toBeUndefined();
    expect(body.error).toMatch(/bearer|token/i);
  });

  it("PATCH with forged bearer → 401 and no Zod issues", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "foo", adminToken: "real-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await PATCH(
      makeRequest("totally-forged", {
        method: "PATCH",
        body: { password: "x".repeat(201) },
      }),
      ctx("foo"),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.issues).toBeUndefined();
    expect(body.error).toMatch(/token/i);
  });

  it("PATCH with a valid token still returns Zod 400 for a bad payload", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "foo", adminToken: "real-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await PATCH(
      makeRequest("real-tok", {
        method: "PATCH",
        body: { password: "x".repeat(201) },
      }),
      ctx("foo"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "password" })]),
    );
  });

  it("PATCH invalid JSON with no bearer → 401, not 400 Invalid JSON", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "foo", adminToken: "real-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const headers = new Headers();
    headers.set("content-type", "application/json");
    const res = await PATCH(
      new Request("http://localhost/api/admin/trips/foo", {
        method: "PATCH",
        headers,
        body: "{not json",
      }),
      ctx("foo"),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.issues).toBeUndefined();
  });

  it("DELETE with no bearer → 401", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "foo", adminToken: "real-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await DELETE(makeRequest(null), ctx("foo"));
    expect(res.status).toBe(401);
    expect((await res.json()).issues).toBeUndefined();
  });

  it("DELETE guest with no bearer → 401, even for an invalid id", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ slug: "foo", adminToken: "real-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await guestDELETE(makeRequest(null), guestCtx("foo", "not-an-id"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.issues).toBeUndefined();
    expect(body.error).not.toMatch(/guest id/i);
  });

  it("PATCH lodging: null deletes lodging", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "cabin",
      adminToken: "cabin-tok",
      content: { kind: "trip", trip: { siteName: "Cabin" }, lodging: { name: "Lodge" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await PATCH(
      makeRequest("cabin-tok", {
        method: "PATCH",
        body: { content: { lodging: null } },
      }),
      ctx("cabin"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trip.content.lodging).toBeUndefined();
  });
});
