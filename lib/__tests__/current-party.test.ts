import { afterEach, describe, expect, it, vi } from "vitest";
import { authCookieValue } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createMemoryDb } from "@/test/api/memory-db";
import { guestEventCookieValue, EVENT_COOKIE } from "@/lib/guest-event-auth";
import { REQUEST_PATHNAME_HEADER } from "@/lib/request-pathname";

const cookieStore = { value: undefined as string | undefined };
const headerStore = { pathname: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => (cookieStore.value ? { value: cookieStore.value } : undefined),
  })),
  headers: vi.fn(async () => ({
    get: (name: string) =>
      name === REQUEST_PATHNAME_HEADER ? headerStore.pathname ?? null : null,
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
    headerStore.pathname = undefined;
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

  it("rejects a guest cookie for a trip that was unpublished", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 8,
      slug: "unpublished-trip",
      password: "crew-secret",
      published: false,
      content: { kind: "trip", trip: { siteName: "Private trip" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieStore.value = await authCookieValue(8, "crew-secret");

    expect(await getCurrentParty()).toBeNull();
  });

  it("binds /g/{token} to that event instead of a leftover trip cookie", async () => {
    const mem = createMemoryDb();
    const night = { kind: "trip" as const, trip: { siteName: "UX Night" } };
    const moab = { kind: "trip" as const, trip: { siteName: "Moab weekend" } };
    const inviteB = "b".repeat(32);
    mem.seedParty({
      id: 1,
      slug: "ux-night",
      password: "night-secret",
      guestToken: "a".repeat(32),
      published: true,
      content: night,
    });
    mem.seedParty({
      id: 2,
      slug: "moab-weekend",
      password: "moab-secret",
      guestToken: inviteB,
      published: true,
      content: moab,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieStore.value = await authCookieValue(1, "night-secret");
    headerStore.pathname = `/g/${inviteB}`;

    expect(await getCurrentParty()).toEqual({
      partyId: 2,
      slug: "moab-weekend",
      content: moab,
      guestPath: `/g/${inviteB}`,
    });
  });

  it("does not keep a leftover event cookie when the invite is for another trip", async () => {
    const mem = createMemoryDb();
    const inviteA = "a".repeat(32);
    const inviteB = "b".repeat(32);
    mem.seedParty({
      id: 1,
      slug: "ux-night",
      guestToken: inviteA,
      published: true,
      content: { kind: "trip", trip: { siteName: "UX Night" } },
    });
    mem.seedParty({
      id: 2,
      slug: "moab-weekend",
      guestToken: inviteB,
      published: true,
      content: { kind: "trip", trip: { siteName: "Moab weekend" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieStore.value = await guestEventCookieValue(1, inviteA);
    headerStore.pathname = `/g/${inviteB}`;

    const current = await getCurrentParty();
    expect(current?.partyId).toBe(2);
    expect(current?.slug).toBe("moab-weekend");
    expect(cookieStore.value.startsWith("1.")).toBe(true);
    expect(EVENT_COOKIE).toBe("bp_event");
  });
});
