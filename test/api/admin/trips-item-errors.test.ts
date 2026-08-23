/** Item endpoints must always answer with the JSON {error} envelope, never HTML 500. */

import { describe, it, expect, afterEach, vi } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/admin/trips/[slug]/route";
import { getDb } from "@/lib/db";
import { createMemoryDb } from "../memory-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

function makeRequest(
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

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function seededDb() {
  const mem = createMemoryDb();
  const content = { kind: "trip" as const, trip: { siteName: "Cabin Weekend" } };
  mem.seedParty({
    slug: "cabin",
    adminToken: "cabin-tok",
    content,
    draftContent: content,
    published: true,
  });
  return mem;
}

/** DB stand-in: every select chain works until the Nth `.limit()`, which throws. */
function dbFailingOnNthQuery(failOnCall: number, firstRows: Record<string, unknown>[]) {
  let call = 0;
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            call += 1;
            if (call === failOnCall) throw new Error("query blip");
            return firstRows;
          },
        }),
      }),
    }),
  } as never;
}

/** Full party rows (with adminToken) so the auth lookup in query 1 succeeds. */
function seededPartyRows() {
  const mem = seededDb();
  return [...mem.parties];
}

describe("admin item endpoint JSON envelopes", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("GET returns the JSON envelope when the auth lookup throws", async () => {
    vi.mocked(getDb).mockImplementation(() => {
      throw new Error("db down");
    });
    const res = await GET(makeRequest("cabin-tok"), ctx("cabin"));
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({ error: "Failed to get trip" });
  });

  it("PATCH password-conflict check failure returns a JSON 500, not an unhandled HTML error", async () => {
    // Query 1 = auth lookup (succeeds), query 2 = password-conflict check (throws).
    vi.mocked(getDb).mockReturnValue(
      dbFailingOnNthQuery(2, seededPartyRows()),
    );

    const res = await PATCH(
      makeRequest("cabin-tok", {
        method: "PATCH",
        body: { password: "new-pass-1" },
      }),
      ctx("cabin"),
    );
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({ error: "Failed to update trip" });
  });

  it("DELETE returns the JSON envelope when the auth lookup throws", async () => {
    vi.mocked(getDb).mockImplementation(() => {
      throw new Error("db down");
    });
    const res = await DELETE(makeRequest("cabin-tok"), ctx("cabin"));
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({ error: "Failed to delete trip" });
  });

  it("happy path is unchanged: PATCH with a fresh password still 200s after the guarded conflict check", async () => {
    const mem = seededDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    const res = await PATCH(
      makeRequest("cabin-tok", {
        method: "PATCH",
        body: { password: "brand-new-pass" },
      }),
      ctx("cabin"),
    );
    expect(res.status).toBe(200);
  });
});
