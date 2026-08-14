import { describe, it, expect, afterEach, vi } from "vitest";
import { GET as tripsGET, POST as tripsPOST } from "@/app/api/admin/trips/route";
import { GET as tripGET, PATCH as tripsPATCH } from "@/app/api/admin/trips/[slug]/route";
import { GET as tripsGuestsGET } from "@/app/api/admin/trips/[slug]/guests/route";
import { GET as openapiGET } from "@/app/api/openapi/route";
import { GET as collectionGET, POST as collectionPOST } from "@/lib/admin-api/collection";
import { PATCH as itemPATCH } from "@/lib/admin-api/item";
import nextConfig from "@/next.config";
import { getDb } from "@/lib/db";
import { openApiSpec } from "@/lib/openapi";
import { resetRateLimitStore } from "@/lib/rate-limit";
import { createMemoryDb } from "../memory-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

function makeRequest(
  token: string | null,
  init: { method?: string; body?: unknown; url?: string } = {},
): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  return new Request(init.url ?? "http://localhost/api/admin/trips", {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("trips / parties dual-mount", () => {
  afterEach(() => {
    delete process.env.ADMIN_API_TOKEN;
    resetRateLimitStore();
    vi.mocked(getDb).mockReset();
  });

  it("rewrites /parties onto /trips so both prefixes work without extra Vercel functions", async () => {
    const rewrites = await nextConfig.rewrites?.();
    expect(rewrites).toEqual(
      expect.arrayContaining([
        { source: "/api/admin/parties", destination: "/api/admin/trips" },
        { source: "/api/admin/parties/:path*", destination: "/api/admin/trips/:path*" },
        { source: "/api/openapi.json", destination: "/api/openapi" },
      ]),
    );
    expect(typeof collectionGET).toBe("function");
    expect(typeof collectionPOST).toBe("function");
    expect(typeof itemPATCH).toBe("function");
  });

  it("walkthrough works on /trips and still works on /parties", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const created = await tripsPOST(
      makeRequest(null, {
        method: "POST",
        body: { content: { trip: { siteName: "Jackson Hole '26" } } },
      }),
    );
    expect(created.status).toBe(201);
    const packet = await created.json();
    expect(packet.trip.slug).toBe("jackson-hole-26");
    expect(packet.party.slug).toBe("jackson-hole-26");
    const token = packet.adminToken as string;
    const slug = packet.slug as string;

    const patched = await tripsPATCH(
      makeRequest(token, {
        method: "PATCH",
        url: `http://localhost/api/admin/trips/${slug}`,
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

    const viaTrips = await tripGET(makeRequest(token), ctx(slug));
    expect(viaTrips.status).toBe(200);
    const tripBody = await viaTrips.json();
    expect(tripBody.trip.content.schedule[0].entries[0].title).toBe("Saturday dinner");
    expect(tripBody.party.content.trip.siteName).toBe("Jackson Hole '26");

    const guests = await tripsGuestsGET(makeRequest(token), ctx(slug));
    expect(guests.status).toBe(200);
    expect(await guests.json()).toEqual({ guests: [] });

    mem.seedParty({ slug: "other", adminToken: "other-tok", content: { trip: { siteName: "Other" } } });
    const listed = await tripsGET(makeRequest(token));
    expect(listed.status).toBe(200);
    const index = await listed.json();
    expect(index.trips).toHaveLength(1);
    expect(index.parties).toEqual(index.trips);
    expect(index.trips[0].slug).toBe("jackson-hole-26");
  });
});

describe("OpenAPI", () => {
  it("GET /api/openapi.json is 200 with OpenAPI 3.1 and the trip operations", async () => {
    const res = await openapiGET();
    expect(res.status).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.paths["/api/admin/trips"].post).toBeTruthy();
    expect(spec.paths["/api/admin/trips"].post.security).toEqual([]);
    expect(spec.paths["/api/admin/trips/{slug}"].patch).toBeTruthy();
    expect(spec.paths["/api/admin/trips/{slug}"].delete).toBeTruthy();
    expect(spec.paths["/api/admin/trips/{slug}/guests"].get).toBeTruthy();
    expect(spec.paths["/api/admin/trips/{slug}/guests/{id}"].delete).toBeTruthy();
    expect(spec.components.schemas.CreateTrip.properties.content).toBeTruthy();
    expect(spec.components.schemas.UpdateTrip.properties.content).toBeTruthy();
    expect(spec.components.schemas.PartyContent.properties.trip.required).toContain("siteName");
    expect(JSON.stringify(spec)).not.toContain("ADMIN_API_TOKEN");
  });

  it("embeds the live Zod create schema (siteName required, kind trip-only)", () => {
    const spec = openApiSpec();
    const create = spec.components.schemas.CreateTrip as {
      properties: { content: { properties: { kind: { const: string }; trip: { required: string[] } } } };
    };
    expect(create.properties.content.properties.kind.const).toBe("trip");
    expect(create.properties.content.properties.trip.required).toContain("siteName");
  });

  it("documents reserved slugs on create", () => {
    const spec = openApiSpec();
    const slug = (spec.components.schemas.CreateTrip as {
      properties: { slug: { description?: string; not?: { enum: string[] } } };
    }).properties.slug;
    expect(slug.not?.enum).toEqual(
      expect.arrayContaining(["admin", "api", "rsvp", "schedule", "activities", "basecamp", "login", "demo"]),
    );
    expect(slug.description).toMatch(/reserved/i);
    expect(spec.info.description).toMatch(/reserved app routes/i);
  });
});
