import { afterEach, describe, expect, it, vi } from "vitest";
import { authCookieValue } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createMemoryDb } from "@/test/api/memory-db";

const cookieStore = { value: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => (cookieStore.value ? { value: cookieStore.value } : undefined),
  })),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

import { getCurrentParty } from "@/lib/current-party";

describe("getCurrentParty", () => {
  afterEach(() => {
    cookieStore.value = undefined;
    vi.mocked(getDb).mockReset();
    delete process.env.PARTY_PASSWORD;
  });

  it("does not treat a leftover slug=demo row as the current party", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 3,
      slug: "demo",
      password: "packet-password",
      content: { kind: "trip", trip: { siteName: "Seeded Demo" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieStore.value = await authCookieValue(3, "packet-password");

    expect(await getCurrentParty()).toBeNull();
  });

  it("still resolves a real trip from a matching cookie", async () => {
    const mem = createMemoryDb();
    const content = { kind: "trip" as const, trip: { siteName: "Jackson Hole '26" } };
    mem.seedParty({
      id: 7,
      slug: "jackson-hole-26",
      password: "crew-secret",
      content,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieStore.value = await authCookieValue(7, "crew-secret");

    expect(await getCurrentParty()).toEqual({
      partyId: 7,
      slug: "jackson-hole-26",
      content,
    });
  });
});
