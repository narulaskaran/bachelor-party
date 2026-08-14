import { describe, it, expect, afterEach, vi } from "vitest";
import { getDb } from "@/lib/db";
import {
  guestSlugFromPathname,
  MISSING_GUEST_REWRITE,
  partyExists,
} from "@/lib/party-exists";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

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

describe("guestSlugFromPathname", () => {
  it("returns the slug for a single-segment trip URL", () => {
    expect(guestSlugFromPathname("/foo")).toBe("foo");
    expect(guestSlugFromPathname("/demo")).toBe("demo");
  });

  it("ignores home, not-found rewrite targets, and nested paths", () => {
    expect(guestSlugFromPathname("/")).toBeNull();
    expect(guestSlugFromPathname("/_not-found")).toBeNull();
    expect(guestSlugFromPathname(MISSING_GUEST_REWRITE)).toBeNull();
    expect(guestSlugFromPathname("/foo/bar")).toBeNull();
  });
});

describe("partyExists", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("no database: only the demo slug exists", async () => {
    vi.mocked(getDb).mockReturnValue(null);
    expect(await partyExists("demo")).toBe(true);
    expect(await partyExists("foo")).toBe(false);
  });

  it("database: true when a row matches the slug", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb([{ id: 1 }]) as never);
    expect(await partyExists("jackson-hole-26")).toBe(true);
  });

  it("database: false when no row matches", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb([]) as never);
    expect(await partyExists("foo")).toBe(false);
  });

  it("database: demo still exists when no demo row is seeded", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb([]) as never);
    expect(await partyExists("demo")).toBe(true);
  });
});
