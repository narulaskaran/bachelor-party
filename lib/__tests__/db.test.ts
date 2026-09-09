import { afterEach, describe, expect, it, vi } from "vitest";

const neonMock = vi.fn((url: string) => ({ neon: true, url }));
const drizzleMock = vi.fn((sql: unknown, opts: unknown) => ({ sql, opts }));

vi.mock("@neondatabase/serverless", () => ({
  neon: (url: string) => neonMock(url),
}));

vi.mock("drizzle-orm/neon-http", () => ({
  drizzle: (sql: unknown, opts: unknown) => drizzleMock(sql, opts),
}));

describe("getDb singleton", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    neonMock.mockClear();
    drizzleMock.mockClear();
  });

  it("returns null when DATABASE_URL is unset", async () => {
    delete process.env.DATABASE_URL;
    const { getDb, resetDb } = await import("@/lib/db");
    resetDb();
    expect(getDb()).toBeNull();
    expect(neonMock).not.toHaveBeenCalled();
    expect(drizzleMock).not.toHaveBeenCalled();
  });

  it("reuses one neon+drizzle client for repeated calls with the same URL", async () => {
    process.env.DATABASE_URL = "postgres://example/db";
    const { getDb, resetDb } = await import("@/lib/db");
    resetDb();

    const first = getDb();
    const second = getDb();
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(neonMock).toHaveBeenCalledTimes(1);
    expect(drizzleMock).toHaveBeenCalledTimes(1);
    expect(neonMock).toHaveBeenCalledWith("postgres://example/db");
  });

  it("builds a new client after resetDb or a DATABASE_URL change", async () => {
    process.env.DATABASE_URL = "postgres://example/db-a";
    const { getDb, resetDb } = await import("@/lib/db");
    resetDb();

    const a = getDb();
    process.env.DATABASE_URL = "postgres://example/db-b";
    const b = getDb();
    expect(b).not.toBe(a);
    expect(neonMock).toHaveBeenCalledTimes(2);

    resetDb();
    process.env.DATABASE_URL = "postgres://example/db-b";
    const c = getDb();
    expect(c).not.toBe(b);
    expect(neonMock).toHaveBeenCalledTimes(3);
  });
});
