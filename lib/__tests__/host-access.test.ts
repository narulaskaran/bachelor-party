import { afterEach, describe, expect, it, vi } from "vitest";
import { HOST_COOKIE, hostCookieValue } from "@/lib/host-auth";
import { getDb } from "@/lib/db";
import { createMemoryDb } from "@/test/api/memory-db";

const setCookie = vi.fn();
const cookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: cookieGet,
    set: setCookie,
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

import { openAsHost, setScheduleKeyEvent, unlockHostTrip } from "@/lib/host-access";

const fridaySchedule = [
  {
    key: "friday",
    date: "2030-08-30",
    weekday: "Friday",
    label: "Arrival",
    timed: true,
    entries: [
      { time: "11:00 AM", title: "Arrivals" },
      { time: "3:00 PM", title: "Check in", marquee: true },
      { time: "7:00 PM", title: "Dinner" },
    ],
  },
];

describe("unlockHostTrip / setScheduleKeyEvent", () => {
  afterEach(() => {
    setCookie.mockReset();
    cookieGet.mockReset();
    vi.mocked(getDb).mockReset();
  });

  it("sets the host cookie and redirects to the picker", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      adminToken: "host-tok",
      content: { kind: "trip", trip: { siteName: "Cabin Weekend" } },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    await expect(unlockHostTrip("cabin-weekend", "host-tok")).rejects.toThrow(
      "REDIRECT:/cabin-weekend/host",
    );

    const expected = await hostCookieValue(9, "host-tok");
    expect(setCookie).toHaveBeenCalledWith(
      HOST_COOKIE,
      expected,
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
  });

  it("openAsHost is the packet form action and unlocks the same way", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      adminToken: "host-tok",
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    await expect(openAsHost("cabin-weekend", "host-tok")).rejects.toThrow(
      "REDIRECT:/cabin-weekend/host",
    );
    expect(setCookie).toHaveBeenCalled();
  });

  it("does not set a cookie for the guest password", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      password: "guest-pw",
      adminToken: "host-tok",
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const result = await unlockHostTrip("cabin-weekend", "guest-pw");
    expect(result.error).toMatch(/host key/i);
    expect(setCookie).not.toHaveBeenCalled();
  });

  it("saves a key event when the host cookie matches", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      adminToken: "host-tok",
      content: {
        kind: "trip",
        trip: { siteName: "Cabin Weekend" },
        schedule: fridaySchedule,
      },
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });

    const result = await setScheduleKeyEvent("cabin-weekend", "friday", 2, true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schedule[0].entries[2].marquee).toBe(true);
    expect(mem.parties[0].content).toMatchObject({
      schedule: [{ entries: [{}, { marquee: true }, { marquee: true }] }],
    });
  });
});
