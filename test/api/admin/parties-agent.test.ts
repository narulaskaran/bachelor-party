/** Route-level tests for sparse create, merge-patch, organizer packet, guest auth. */

import { describe, it, expect, afterEach, vi } from "vitest";
import { GET as listGET, POST } from "@/app/api/admin/trips/route";
import { GET, PATCH, DELETE } from "@/app/api/admin/trips/[slug]/route";
import { POST as PUBLISH } from "@/app/api/admin/trips/[slug]/publish/route";
import { GET as guestsGET } from "@/app/api/admin/trips/[slug]/guests/route";
import { DELETE as guestDELETE } from "@/app/api/admin/trips/[slug]/guests/[id]/route";
import { AUTH_COOKIE } from "@/lib/auth";
import { DEMO_PARTY } from "@/lib/demo-party";
import { getDb } from "@/lib/db";
import { extractPlanWithOpenRouter } from "@/lib/plan-extract";
import { cookieAuthenticatesHost, HOST_COOKIE } from "@/lib/host-auth";
import { CREATE_RATE_LIMIT, consumeRateLimit, createRateLimitKey, resetRateLimitStore } from "@/lib/rate-limit";
import { createMemoryDb } from "../memory-db";
import type { NextResponse } from "next/server";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

vi.mock("@/lib/plan-extract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plan-extract")>();
  return { ...actual, extractPlanWithOpenRouter: vi.fn(actual.extractPlanWithOpenRouter) };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function makeRequest(
  token: string | null,
  init: { method?: string; body?: unknown; url?: string; ip?: string; cookie?: string } = {},
): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  if (init.ip) headers.set("x-forwarded-for", init.ip);
  if (init.cookie) headers.set("cookie", init.cookie);
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
    vi.mocked(extractPlanWithOpenRouter).mockClear();
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
    expect(body.url).toBe("http://localhost/jackson-hole-26/host");
    expect(body.password).toEqual(expect.any(String));
    expect(body.password.length).toBeGreaterThanOrEqual(8);
    expect(body.adminToken).toEqual(expect.any(String));
    expect(body.party.slug).toBe("jackson-hole-26");
    expect(body.published).toBe(false);
    expect(body.guestUrl).toBeNull();
    expect(body.hostUrl).toBe("/jackson-hole-26/host");
    expect(mem.parties[0].published).toBe(false);
    expect(mem.parties[0].content).toMatchObject({
      kind: "trip",
      trip: { siteName: "Jackson Hole '26" },
    });
  });

  it("create 201 sets a host session cookie that matches host auth checks", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        body: { content: { trip: { siteName: "Cabin Weekend" } } },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const cookie = (res as NextResponse).cookies.get(HOST_COOKIE);
    const party = mem.parties[0] as { id: number; adminToken: string };

    expect(cookie?.name).toBe(HOST_COOKIE);
    expect(cookie?.path).toBe("/");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.value).not.toBe(body.adminToken);
    expect((res as NextResponse).cookies.get(AUTH_COOKIE)).toBeUndefined();
    expect(await cookieAuthenticatesHost(cookie?.value, party.id, party.adminToken)).toBe(true);
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

  it("keeps admin PATCH content and the host draft on one canonical snapshot", async () => {
    const mem = createMemoryDb();
    const published = {
      kind: "trip" as const,
      trip: { siteName: "Cabin Weekend" },
    };
    mem.seedParty({
      slug: "cabin",
      adminToken: "cabin-tok",
      content: published,
      draftContent: published,
      published: true,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const patched = await PATCH(
      makeRequest("cabin-tok", {
        method: "PATCH",
        body: { content: { trip: { tagline: "Let's go" } } },
      }),
      ctx("cabin"),
    );

    expect(patched.status).toBe(200);
    expect(mem.parties[0].content).toMatchObject({
      trip: { siteName: "Cabin Weekend" },
    });
    expect("tagline" in (mem.parties[0].content as { trip: Record<string, unknown> }).trip).toBe(false);
    expect(mem.parties[0].draftContent).toMatchObject({
      trip: { siteName: "Cabin Weekend", tagline: "Let's go" },
    });
    const body = await patched.json();
    expect(body.trip.content.trip.tagline).toBe("Let's go");
    expect(body.trip.published).toBe(true);
  });

  it("preserves legacy HTTP URLs for unrelated edits but rejects HTTP URL edits", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "legacy-links",
      adminToken: "legacy-links-tok",
      content: {
        kind: "trip",
        trip: { siteName: "Legacy Links" },
        lodging: { name: "Cabin", url: "HTTP://legacy.example/cabin" },
      },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const unrelated = await PATCH(
      makeRequest("legacy-links-tok", {
        method: "PATCH",
        body: { content: { trip: { tagline: "Updated" } } },
      }),
      ctx("legacy-links"),
    );
    expect(unrelated.status).toBe(200);
    const preserved = await unrelated.json();
    expect(preserved.party.content.lodging.url).toBe("HTTP://legacy.example/cabin");

    const edited = await PATCH(
      makeRequest("legacy-links-tok", {
        method: "PATCH",
        body: { content: { lodging: { url: "http://new.example/cabin" } } },
      }),
      ctx("legacy-links"),
    );
    expect(edited.status).toBe(400);
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
    expect(body.url).toBe("http://localhost/admin-3/host");
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

  it("POST inverted start/end → 400 and does not create", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        body: {
          content: {
            trip: {
              siteName: "Cabin Weekend",
              startDate: "2026-12-20",
              endDate: "2026-12-10",
            },
          },
        },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.some((i: { path: string; message: string }) =>
      i.path.includes("endDate") && /before start date/i.test(i.message),
    )).toBe(true);
    expect(mem.parties).toHaveLength(0);
  });

  it("POST same-day or a single date still creates", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const sameDay = await POST(
      makeRequest(null, {
        method: "POST",
        body: {
          content: {
            trip: { siteName: "Same Day", startDate: "2026-12-20", endDate: "2026-12-20" },
          },
        },
      }),
    );
    expect(sameDay.status).toBe(201);

    const startOnly = await POST(
      makeRequest(null, {
        method: "POST",
        body: { content: { trip: { siteName: "Start Only", startDate: "2026-12-20" } } },
      }),
    );
    expect(startOnly.status).toBe(201);

    const endOnly = await POST(
      makeRequest(null, {
        method: "POST",
        body: { content: { trip: { siteName: "End Only", endDate: "2026-12-10" } } },
      }),
    );
    expect(endOnly.status).toBe(201);
    expect(mem.parties).toHaveLength(3);
  });

  it("PATCH inverted start/end → 400 and does not persist", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "cabin",
      adminToken: "cabin-tok",
      content: { kind: "trip", trip: { siteName: "Cabin", startDate: "2026-12-20" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await PATCH(
      makeRequest("cabin-tok", {
        method: "PATCH",
        body: { content: { trip: { endDate: "2026-12-10" } } },
      }),
      ctx("cabin"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.some((i: { path: string; message: string }) =>
      i.path.includes("endDate") && /before start date/i.test(i.message),
    )).toBe(true);
    expect(
      (mem.parties[0].content as { trip: { endDate?: string } }).trip.endDate,
    ).toBeUndefined();
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
    expect(body.party.content.packing).toEqual(DEMO_PARTY.packing);
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
    expect(body.guests[0].guestToken).toBeUndefined();

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

  it("PATCH packing is kept after the content schema gate", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "cabin",
      adminToken: "cabin-tok",
      content: { kind: "trip", trip: { siteName: "Cabin" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const packing = [
      { title: "Government ID" },
      { title: "Layers", note: "Nights drop below 40" },
    ];
    const res = await PATCH(
      makeRequest("cabin-tok", {
        method: "PATCH",
        body: { content: { packing } },
      }),
      ctx("cabin"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trip.content.packing).toEqual(packing);
    expect(body.trip.content.trip.siteName).toBe("Cabin");
  });

  it("plan dump lifts only written facts and stays unpublished", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        body: {
          plan: "Cabin weekend\nLocation: Denver, CO\nLet's maybe get 20 people downtown around 7 if we can",
          preset: "weekend",
        },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.published).toBe(false);
    expect(body.guestUrl).toBeNull();
    expect(body.hostUrl).toBe(`/${body.slug}/host`);
    expect(body.content.trip.siteName).toBe("Cabin weekend");
    expect(body.content.trip.location).toBe("Denver, CO");
    expect(body.content.trip.startTime).toBeUndefined();
    expect(body.content.rsvp?.maxPartySize).toBeUndefined();
    expect(body.draftReview.acknowledged).toBe(false);
    const tz = body.draftReview.facts.find((f: { path: string }) => f.path === "trip.timezone");
    expect(tz?.status).toBe("missing");
    expect(mem.parties[0].published).toBe(false);
  });

  it("messy unlabeled paragraph extracts stated facts, stays unpublished, and does not invent headcount", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    vi.mocked(extractPlanWithOpenRouter).mockResolvedValueOnce({
      siteName: "Friday drinks",
      startDate: "2026-09-04",
      startTime: "7:00 PM",
      location: "The Dead Rabbit, NYC",
    });

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        body: {
          plan: "yeah so friday drinks at the dead rabbit in nyc september 4 around seven we should get there early I don't know the address yet maybe 12 people",
          preset: "night-out",
        },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.published).toBe(false);
    expect(body.guestUrl).toBeNull();
    expect(body.content.trip.siteName).toBe("Friday drinks");
    expect(body.content.trip.startDate).toBe("2026-09-04");
    expect(body.content.trip.startTime).toBe("7:00 PM");
    expect(body.content.trip.location).toBe("The Dead Rabbit, NYC");
    expect(body.content.trip.timezone).toBeUndefined();
    expect(body.content.trip.address).toBeUndefined();
    expect(body.content.rsvp?.maxPartySize).toBeUndefined();
    expect(body.draftReview.acknowledged).toBe(false);
    expect(
      body.draftReview.facts.find((f: { path: string }) => f.path === "trip.timezone")?.status,
    ).toBe("missing");
    expect(mem.parties[0].published).toBe(false);
  });

  it("dump create cannot publish until the host acknowledges the fact review", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const created = await POST(
      makeRequest(null, {
        method: "POST",
        body: { plan: "Cabin weekend\nLocation: Denver, CO", preset: "weekend" },
      }),
    );
    const packet = await created.json();
    const blocked = await PUBLISH(
      makeRequest(packet.adminToken, { method: "POST" }),
      ctx(packet.slug),
    );
    expect(blocked.status).toBe(409);
    expect(mem.parties[0].published).toBe(false);
    expect((await blocked.json()).error).toMatch(/review every fact/i);
  });

  it("abbreviation timezones stay missing/TBD on dump create", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      makeRequest(null, {
        method: "POST",
        body: { plan: "Dinner\nTimezone: ET\n2026-09-04 7:00 PM — dinner", preset: "night-out" },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content.trip.timezone).toBeUndefined();
    expect(
      body.draftReview.facts.find((f: { path: string }) => f.path === "trip.timezone")?.status,
    ).toBe("missing");
  });

  it("PATCH of a published trip does not publish the draft or change guest content", async () => {
    const mem = createMemoryDb();
    const published = { kind: "trip" as const, trip: { siteName: "Cabin Weekend" } };
    mem.seedParty({
      slug: "cabin",
      adminToken: "cabin-tok",
      content: published,
      draftContent: published,
      published: true,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const patched = await PATCH(
      makeRequest("cabin-tok", {
        method: "PATCH",
        body: { content: { trip: { tagline: "Secret rewrite" } } },
      }),
      ctx("cabin"),
    );
    expect(patched.status).toBe(200);
    const body = await patched.json();
    expect(body.trip.published).toBe(true);
    expect(body.trip.content.trip.tagline).toBe("Secret rewrite");
    expect(mem.parties[0].published).toBe(true);
    expect(mem.parties[0].content).toEqual(published);
  });

  it("publish requires host auth and returns guestUrl after review", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const created = await POST(
      makeRequest(null, {
        method: "POST",
        body: { content: { trip: { siteName: "Cabin Weekend" } } },
      }),
    );
    const packet = await created.json();
    const slug = packet.slug as string;
    const token = packet.adminToken as string;

    const unauth = await PUBLISH(makeRequest(null, { method: "POST" }), ctx(slug));
    expect(unauth.status).toBe(401);

    const published = await PUBLISH(makeRequest(token, { method: "POST" }), ctx(slug));
    expect(published.status).toBe(200);
    const body = await published.json();
    expect(body.published).toBe(true);
    expect(body.guestUrl).toMatch(/^\/g\/[0-9a-f]{32}$/);
    expect(mem.parties[0].published).toBe(true);

    const cookie = (created as NextResponse).cookies.get(HOST_COOKIE);
    mem.parties[0].published = false;
    const viaCookie = await PUBLISH(
      makeRequest(null, { method: "POST", cookie: `${HOST_COOKIE}=${cookie?.value}` }),
      ctx(slug),
    );
    expect(viaCookie.status).toBe(200);
    expect((await viaCookie.json()).guestUrl).toMatch(/^\/g\/[0-9a-f]{32}$/);
  });
});
