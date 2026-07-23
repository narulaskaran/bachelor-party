/** Route-level tests for GET /api/admin/parties/:slug — app/api/admin/parties/[slug]/route.ts */

import { describe, it, expect, afterEach, vi } from "vitest";
import { GET } from "@/app/api/admin/parties/[slug]/route";
import { getDb } from "@/lib/db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

// Chainable stand-in for `db.select().from().where().limit()` — resolves to
// whatever rows the test configures, regardless of the actual query shape.
function fakeDb(rows: Record<string, unknown>[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  };
}

function makeRequest(token: string | null): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request("http://localhost/api/admin/parties/test-party", { headers });
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

const partyRow = {
  id: "party-1",
  slug: "test-party",
  password: "party-secret-pw",
  adminToken: "party-scoped-token",
  content: { trip: { siteName: "Test Trip" } },
};

describe("GET /api/admin/parties/:slug", () => {
  afterEach(() => {
    delete process.env.ADMIN_API_TOKEN;
    vi.mocked(getDb).mockReset();
  });

  it("returns 503 when database is unavailable", async () => {
    vi.mocked(getDb).mockReturnValue(null);
    const res = await GET(makeRequest("anything"), ctx("test-party"));
    expect(res.status).toBe(503);
  });

  it("no token → 401, even when the party exists", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb([partyRow]) as never);
    const res = await GET(makeRequest(null), ctx("test-party"));
    expect(res.status).toBe(401);
  });

  it("no token → 401, not 404, when the slug doesn't exist (enumeration-leak regression)", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb([]) as never);
    const res = await GET(makeRequest(null), ctx("nonexistent"));
    expect(res.status).toBe(401);
  });

  it("wrong token → 401", async () => {
    process.env.ADMIN_API_TOKEN = "global-token";
    vi.mocked(getDb).mockReturnValue(fakeDb([partyRow]) as never);
    const res = await GET(makeRequest("wrong"), ctx("test-party"));
    expect(res.status).toBe(401);
  });

  it("correct global ADMIN_API_TOKEN → 200 with the full record, including password", async () => {
    process.env.ADMIN_API_TOKEN = "global-token";
    vi.mocked(getDb).mockReturnValue(fakeDb([partyRow]) as never);
    const res = await GET(makeRequest("global-token"), ctx("test-party"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.party.password).toBe("party-secret-pw");
    expect(body.party.slug).toBe("test-party");
  });

  it("correct party-scoped admin_token → 200", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb([partyRow]) as never);
    const res = await GET(makeRequest("party-scoped-token"), ctx("test-party"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.party.slug).toBe("test-party");
  });

  it("party-scoped token for a different party → 401, not leaked access", async () => {
    process.env.ADMIN_API_TOKEN = "global-token";
    vi.mocked(getDb).mockReturnValue(fakeDb([partyRow]) as never);
    const res = await GET(makeRequest("some-other-partys-token"), ctx("test-party"));
    expect(res.status).toBe(401);
  });

  it("valid token but slug doesn't exist → 404", async () => {
    process.env.ADMIN_API_TOKEN = "global-token";
    vi.mocked(getDb).mockReturnValue(fakeDb([]) as never);
    const res = await GET(makeRequest("global-token"), ctx("nonexistent"));
    expect(res.status).toBe(404);
  });
});
