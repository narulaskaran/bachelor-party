/** Route-level tests for sparse create, merge-patch, organizer packet, guest auth. */

import { describe, it, expect, afterEach, vi } from "vitest";
import { GET as listGET, POST } from "@/app/api/admin/trips/route";
import { GET, PATCH } from "@/app/api/admin/trips/[slug]/route";
import { GET as guestsGET } from "@/app/api/admin/trips/[slug]/guests/route";
import { DELETE as guestDELETE } from "@/app/api/admin/trips/[slug]/guests/[id]/route";
import { DEMO_PARTY } from "@/lib/demo-party";
import { getDb } from "@/lib/db";
import { createMemoryDb } from "../memory-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

const GLOBAL = "global-token";

function makeRequest(
  token: string | null,
  init: { method?: string; body?: unknown; url?: string } = {},
): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("content-type", "application/json");
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
    vi.mocked(getDb).mockReset();
  });

  it("POST siteName-only → 201 organizer packet with autogen slug and password", async () => {
    process.env.ADMIN_API_TOKEN = GLOBAL;
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      makeRequest(GLOBAL, {
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

  it("POST colliding slug → 409 with hint, does not upsert", async () => {
    process.env.ADMIN_API_TOKEN = GLOBAL;
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "jackson-hole-26",
      content: { trip: { siteName: "Original" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      makeRequest(GLOBAL, {
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
    process.env.ADMIN_API_TOKEN = GLOBAL;
    vi.mocked(getDb).mockReturnValue(createMemoryDb().db as never);

    const res = await POST(
      makeRequest(GLOBAL, {
        method: "POST",
        body: { content: { kind: "event", trip: { siteName: "Gala" } } },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.some((i: { path: string }) => i.path.includes("kind"))).toBe(true);
  });

  it("party-scoped token cannot list all trips or create", async () => {
    process.env.ADMIN_API_TOKEN = GLOBAL;
    vi.mocked(getDb).mockReturnValue(createMemoryDb().db as never);

    const list = await listGET(makeRequest("party-scoped-token"));
    expect(list.status).toBe(401);

    const created = await POST(
      makeRequest("party-scoped-token", {
        method: "POST",
        body: { content: { trip: { siteName: "Nope" } } },
      }),
    );
    expect(created.status).toBe(401);
  });

  it("PATCH merge-patches one schedule day without wiping lodging", async () => {
    process.env.ADMIN_API_TOKEN = GLOBAL;
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
    process.env.ADMIN_API_TOKEN = GLOBAL;
    const mem = createMemoryDb();
    mem.seedParty({ slug: "demo", adminToken: "party-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await PATCH(
      makeRequest(GLOBAL, {
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
    process.env.ADMIN_API_TOKEN = GLOBAL;
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
    process.env.ADMIN_API_TOKEN = GLOBAL;
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const created = await POST(
      makeRequest(GLOBAL, {
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
    process.env.ADMIN_API_TOKEN = GLOBAL;
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
    process.env.ADMIN_API_TOKEN = GLOBAL;
    const mem = createMemoryDb();
    mem.seedParty({ slug: "alpha", adminToken: "alpha-tok" });
    mem.seedParty({ slug: "beta", adminToken: "beta-tok" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await guestsGET(makeRequest("alpha-tok"), ctx("beta"));
    expect(res.status).toBe(401);
  });
});
