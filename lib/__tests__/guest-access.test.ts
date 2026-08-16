import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIE, authCookieValue } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createMemoryDb } from "@/test/api/memory-db";

const setCookie = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
    set: setCookie,
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const err = new Error(`REDIRECT:${url}`);
    throw err;
  },
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

import { openAsGuest, unlockGuestTrip } from "@/lib/guest-access";

describe("unlockGuestTrip / openAsGuest", () => {
  afterEach(() => {
    setCookie.mockReset();
    vi.mocked(getDb).mockReset();
  });

  it("sets the guest access cookie and redirects to the trip", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      password: "guest-pw",
      content: { kind: "trip", trip: { siteName: "Cabin Weekend" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    await expect(unlockGuestTrip("cabin-weekend", "guest-pw")).rejects.toThrow(
      "REDIRECT:/cabin-weekend",
    );

    const expected = await authCookieValue(9, "guest-pw");
    expect(setCookie).toHaveBeenCalledWith(
      AUTH_COOKIE,
      expected,
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
  });

  it("openAsGuest is the packet form action and unlocks the same way", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      password: "guest-pw",
      content: { kind: "trip", trip: { siteName: "Cabin Weekend" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    await expect(openAsGuest("cabin-weekend", "guest-pw")).rejects.toThrow(
      "REDIRECT:/cabin-weekend",
    );
    expect(setCookie).toHaveBeenCalled();
  });

  it("does not set a cookie for the wrong password", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      password: "guest-pw",
      content: { kind: "trip", trip: { siteName: "Cabin Weekend" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const result = await unlockGuestTrip("cabin-weekend", "nope");
    expect(result.error).toMatch(/wrong password/i);
    expect(setCookie).not.toHaveBeenCalled();
  });
});
