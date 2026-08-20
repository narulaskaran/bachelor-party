import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryDb } from "@/test/api/memory-db";
import { getDb } from "@/lib/db";
import { getCurrentParty } from "@/lib/current-party";
import { RSVP_COOKIE, rsvpCookieName } from "@/lib/merge-guest";
import { REQUEST_PATHNAME_HEADER } from "@/lib/request-pathname";

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
};
const headerStore = { pathname: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
  headers: async () => ({
    get: (name: string) =>
      name === REQUEST_PATHNAME_HEADER ? headerStore.pathname ?? null : null,
  }),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

vi.mock("@/lib/current-party", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/current-party")>();
  return { ...actual, getCurrentParty: vi.fn() };
});

const TOKEN_KARAN = "a".repeat(32);
const INVITE_A = "d".repeat(32);
const INVITE_B = "c".repeat(32);

describe("public guest roster is per event", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
    vi.mocked(getCurrentParty).mockReset();
    cookieStore.get.mockReset();
    headerStore.pathname = undefined;
  });

  function seedTrips() {
    const mem = createMemoryDb();
    const night = { kind: "trip" as const, trip: { siteName: "UX Night" } };
    const fresh = { kind: "trip" as const, trip: { siteName: "New night out" } };
    mem.seedParty({
      id: 1,
      slug: "ux-night",
      guestToken: INVITE_A,
      published: true,
      content: night,
    });
    mem.seedParty({
      id: 2,
      slug: "new-night",
      guestToken: INVITE_B,
      published: true,
      content: fresh,
    });
    mem.seedGuest({
      partyId: 1,
      guestToken: TOKEN_KARAN,
      name: "Karan",
      nameKey: "karan",
      attendanceStatus: "attending",
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    vi.mocked(getCurrentParty).mockResolvedValue({
      partyId: 1,
      slug: "ux-night",
      content: night,
      guestPath: `/g/${INVITE_A}`,
    });
    cookieStore.get.mockImplementation((name: string) => {
      if (name === RSVP_COOKIE || name === rsvpCookieName(1)) return { value: TOKEN_KARAN };
      return undefined;
    });
    return mem;
  }

  it("does not list another trip's RSVP on a brand-new invite", async () => {
    const { getGuests, getRsvpPrefill } = await import("@/lib/rsvp-roster");
    seedTrips();

    await expect(getGuests(INVITE_B)).resolves.toEqual([]);
    await expect(getRsvpPrefill(INVITE_B)).resolves.toBeNull();
    expect(getCurrentParty).not.toHaveBeenCalled();
  });

  it("does not use leftover cookies when this request is /g/{token} for a new event", async () => {
    const { getGuests } = await import("@/lib/rsvp-roster");
    seedTrips();
    headerStore.pathname = `/g/${INVITE_B}`;

    await expect(getGuests()).resolves.toEqual([]);
    expect(getCurrentParty).not.toHaveBeenCalled();
  });

  it("still lists this event's guests after someone RSVPs here", async () => {
    const { getGuests } = await import("@/lib/rsvp-roster");
    const mem = seedTrips();
    mem.seedGuest({
      partyId: 2,
      guestToken: "b".repeat(32),
      name: "Sam",
      nameKey: "sam",
      attendanceStatus: "attending",
    });

    await expect(getGuests(INVITE_B)).resolves.toEqual([
      expect.objectContaining({ name: "Sam", attendanceStatus: "attending" }),
    ]);
    expect(getCurrentParty).not.toHaveBeenCalled();
  });
});
