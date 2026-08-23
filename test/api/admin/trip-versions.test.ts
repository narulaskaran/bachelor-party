/** content_versions audit trail: admin API writes a version row, read API is admin-only, newest first, append-only surface. */

import { describe, it, expect, afterEach, vi } from "vitest";
import { GET as LIST_VERSIONS } from "@/app/api/admin/trips/[slug]/versions/route";
import { GET, PATCH } from "@/app/api/admin/trips/[slug]/route";
import { getDb } from "@/lib/db";
import { createMemoryDb } from "../memory-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

const content = (siteName: string) => ({ kind: "trip" as const, trip: { siteName } });

function itemRequest(
  token: string | null,
  init: { method?: string; body?: unknown } = {},
): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  return new Request("http://localhost/api/admin/trips/cabin", {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

function versionsRequest(token: string | null, query = ""): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer cabin-tok`);
  return new Request(`http://localhost/api/admin/trips/cabin/versions${query}`, { headers });
}

function itemCtx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function versionsCtx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("content_versions audit trail via the admin API", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("PATCH with content records an immutable published version row", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "cabin",
      adminToken: "cabin-tok",
      content: content("Cabin Weekend"),
      draftContent: content("Cabin Weekend"),
      published: true,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await PATCH(
      itemRequest("cabin-tok", { method: "PATCH", body: { content: { trip: { siteName: "Cabin Weekend v2" } } } }),
      itemCtx("cabin"),
    );
    expect(res.status).toBe(200);

    expect(mem.contentVersions).toHaveLength(1);
    const row = mem.contentVersions[0];
    expect(row.version).toBe(1);
    expect(row.state).toBe("published");
    // FULL snapshot, not a diff.
    expect(row.contentSnapshot).toEqual(content("Cabin Weekend v2"));
    expect(row.actorType).toBe("admin");
    // Credential identifier only — the raw token never lands in the audit row.
    expect(JSON.stringify(mem.contentVersions)).not.toContain("cabin-tok");
    expect(String(row.publishedAt)).toBeTruthy();
  });

  it("versions list is admin-token gated", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "cabin",
      adminToken: "cabin-tok",
      content: content("Cabin Weekend"),
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const noToken = await LIST_VERSIONS(versionsRequest(null), versionsCtx("cabin"));
    expect(noToken.status).toBe(401);
    await expect(noToken.json()).resolves.toEqual({ error: "Missing bearer token" });

    const wrongToken = await LIST_VERSIONS(
      (() => {
        const headers = new Headers({ authorization: "Bearer other-trip-token" });
        return new Request("http://localhost/api/admin/trips/cabin/versions", { headers });
      })(),
      versionsCtx("cabin"),
    );
    expect(wrongToken.status).toBe(401);
    await expect(wrongToken.json()).resolves.toEqual({ error: "Invalid token" });
  });

  it("returns stored versions newest-first with full snapshots", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "cabin",
      adminToken: "cabin-tok",
      content: content("Cabin Weekend"),
    });
    // Insert out of order to prove response ordering comes from version.
    mem.contentVersions.push({
      id: 2, partyId: 1, version: 2, state: "published",
      contentSnapshot: content("v2"), actorType: "host",
      changeSummary: "draft published", createdAt: new Date(), publishedAt: new Date(),
    });
    mem.contentVersions.push({
      id: 1, partyId: 1, version: 1, state: "draft",
      contentSnapshot: content("v1"), actorType: "host",
      changeSummary: "trip created", createdAt: new Date(),
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await LIST_VERSIONS(versionsRequest("cabin-tok"), versionsCtx("cabin"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { versions: Array<{ version: number; state: string; contentSnapshot: unknown }> };
    expect(body.versions.map((version) => version.version)).toEqual([2, 1]);
    expect(body.versions[0].contentSnapshot).toEqual(content("v2"));
    expect(body.versions[1].state).toBe("draft");
  });

  it("read surface is read-only: the route module exports no mutation handlers", async () => {
    const mod = await import("@/app/api/admin/trips/[slug]/versions/route");
    expect(Object.keys(mod).filter((key) => key !== "dynamic" && key !== "runtime")).toEqual(["GET"]);
  });

  it("GET trip still answers after audit wiring (no regression)", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      slug: "cabin",
      adminToken: "cabin-tok",
      content: content("Cabin Weekend"),
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    const res = await GET(itemRequest("cabin-tok"), itemCtx("cabin"));
    expect(res.status).toBe(200);
  });
});
