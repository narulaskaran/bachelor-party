import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/trips/route";
import { createTripFromUi } from "@/lib/create-trip";
import { cookieAuthenticatesHost, HOST_COOKIE, hostCookieValue } from "@/lib/host-auth";
import { getDb } from "@/lib/db";
import type { PartyContent } from "@/lib/party-types";
import { resetRateLimitStore } from "@/lib/rate-limit";
import { createMemoryDb } from "@/test/api/memory-db";
import type { NextResponse } from "next/server";

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

import {
  getHostEditorState,
  getHostGuests,
  hostSessionForSlug,
  openAsHost,
  publishHostDraft,
  saveHostDraft,
  setScheduleKeyEvent,
  unlockHostTrip,
} from "@/lib/host-access";

function hostCookieFromResponse(res: Response) {
  return (res as NextResponse).cookies.get(HOST_COOKIE);
}

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
    resetRateLimitStore();
    vi.mocked(getDb).mockReset();
  });

  it("create-set host cookie authorizes Save draft and a later /host GET", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    let created: Response | undefined;
    const result = await createTripFromUi(
      { siteName: "qa-retest-cookie", plan: "2026-09-04 7:00 PM — group dinner" },
      async (_url, init) => {
        created = await POST(
          new Request("http://localhost/api/admin/trips", {
            method: init?.method ?? "POST",
            headers: init?.headers,
            body: init?.body as BodyInit,
          }),
        );
        return created;
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok || !created) return;
    const cookie = hostCookieFromResponse(created);
    const party = mem.parties[0] as {
      id: number;
      adminToken: string;
      draftContent: PartyContent;
    };
    expect(cookie?.name).toBe(HOST_COOKIE);
    expect(cookie?.path).toBe("/");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.value).not.toBe(result.packet.adminToken);
    expect(await cookieAuthenticatesHost(cookie?.value, party.id, party.adminToken)).toBe(true);

    cookieGet.mockReturnValue({ value: cookie?.value });

    const saved = await saveHostDraft(result.packet.slug, {
      ...party.draftContent,
      draftReview: {
        ...(party.draftContent.draftReview ?? { facts: [] }),
        acknowledged: true,
      },
    });
    expect(saved.ok).toBe(true);

    await expect(hostSessionForSlug(result.packet.slug)).resolves.toBe(true);
    await expect(getHostEditorState(result.packet.slug)).resolves.toMatchObject({ ok: true });
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

  it("saves edits to the draft without changing the published snapshot", async () => {
    const mem = createMemoryDb();
    const published = { kind: "trip" as const, trip: { siteName: "Published trip" } };
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      adminToken: "host-tok",
      content: published,
      draftContent: published,
      published: true,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });

    const result = await saveHostDraft("cabin-weekend", {
      kind: "trip",
      trip: { siteName: "Private draft" },
    });

    expect(result.ok).toBe(true);
    expect(mem.parties[0].content).toEqual(published);
    expect(mem.parties[0].draftContent).toMatchObject({
      trip: { siteName: "Private draft" },
    });
  });

  it("preserves RSVP policy and picker key events during a stale editor save", async () => {
    const mem = createMemoryDb();
    const published = {
      kind: "trip" as const,
      trip: { siteName: "Published trip" },
      rsvp: { plusOnePolicy: "allowed" as const, allowPlusOne: true, maxPartySize: 6 },
      schedule: [
        {
          key: "friday",
          date: "2030-08-30",
          weekday: "Friday",
          label: "Arrival",
          timed: true,
          entries: [{ time: "7:00 PM", title: "Dinner", marquee: true }],
        },
      ],
    };
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      adminToken: "host-tok",
      content: published,
      draftContent: published,
      published: true,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });

    const result = await saveHostDraft("cabin-weekend", {
      kind: "trip",
      trip: { siteName: "Updated trip" },
      rsvp: { heading: "RSVP now", description: "Bring a friend" },
      schedule: [
        {
          key: "2030-08-30",
          date: "2030-08-30",
          weekday: "Friday",
          label: "Arrival",
          timed: true,
          entries: [{ time: "7:00 PM", title: "Dinner" }],
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(mem.parties[0].draftContent).toMatchObject({
      trip: { siteName: "Updated trip" },
      rsvp: {
        plusOnePolicy: "allowed",
        allowPlusOne: true,
        maxPartySize: 6,
        heading: "RSVP now",
        description: "Bring a friend",
      },
      schedule: [{ entries: [{ marquee: true }] }],
    });
  });

  it("allows an explicit editor schedule change to remove a key event", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      adminToken: "host-tok",
      content: { kind: "trip", trip: { siteName: "Trip" } },
      draftContent: {
        kind: "trip",
        trip: { siteName: "Trip" },
        schedule: [{
          key: "friday",
          date: "2030-08-30",
          weekday: "Friday",
          label: "Arrival",
          timed: true,
          entries: [{ time: "7:00 PM", title: "Dinner", marquee: true }],
        }],
      },
      published: true,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });

    const result = await saveHostDraft(
      "cabin-weekend",
      {
        kind: "trip",
        trip: { siteName: "Trip" },
        schedule: [{
          key: "2030-08-30",
          date: "2030-08-30",
          weekday: "Friday",
          label: "Arrival",
          timed: true,
          entries: [{ time: "7:00 PM", title: "Dinner" }],
        }],
      },
      false,
    );

    expect(result.ok).toBe(true);
    expect(mem.parties[0].draftContent).toMatchObject({
      schedule: [{ entries: [{ title: "Dinner" }] }],
    });
    const saved = mem.parties[0].draftContent as { schedule: [{ entries: [{ marquee?: boolean }] }] };
    expect(saved.schedule[0].entries[0].marquee).toBeUndefined();
  });

  it("keeps an unchanged legacy HTTP URL while saving another host edit", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "legacy-links",
      adminToken: "host-tok",
      content: {
        kind: "trip",
        trip: { siteName: "Legacy Links" },
        lodging: { name: "Cabin", url: "http://legacy.example/cabin" },
      },
      draftContent: {
        kind: "trip",
        trip: { siteName: "Legacy Links" },
        lodging: { name: "Cabin", url: "http://legacy.example/cabin" },
      },
      published: true,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });

    const result = await saveHostDraft("legacy-links", {
      kind: "trip",
      trip: { siteName: "Updated Legacy Links" },
      lodging: { name: "Cabin", url: "http://legacy.example/cabin" },
    });

    expect(result.ok).toBe(true);
    expect(mem.parties[0].draftContent).toMatchObject({
      trip: { siteName: "Updated Legacy Links" },
      lodging: { url: "http://legacy.example/cabin" },
    });
  });

  it("publishes the current draft as the new guest snapshot", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      adminToken: "host-tok",
      content: { kind: "trip", trip: { siteName: "Old guest version" } },
      draftContent: {
        kind: "trip",
        trip: { siteName: "Ready to publish" },
        draftReview: {
          acknowledged: true,
          facts: [{ path: "trip.siteName", label: "Event name", status: "confirmed", value: "Ready to publish" }],
        },
      },
      published: true,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });

    const result = await publishHostDraft("cabin-weekend");

    expect(result).toEqual({ ok: true });
    expect(mem.parties[0].content).toMatchObject({
      trip: { siteName: "Ready to publish" },
    });
    expect(mem.parties[0].published).toBe(true);
    expect((mem.parties[0].content as { draftReview?: unknown }).draftReview).toBeUndefined();
  });

  it("blocks publishing when the host has not acknowledged the fact review", async () => {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "needs-review",
      adminToken: "host-tok",
      content: { kind: "trip", trip: { siteName: "Old guest version" } },
      draftContent: { kind: "trip", trip: { siteName: "Needs review" } },
      published: false,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });

    await expect(publishHostDraft("needs-review")).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/review every fact/i),
    });
    expect((mem.parties[0].content as { trip: { siteName: string } }).trip.siteName).toBe("Old guest version");
  });

  it("returns full roster details only with the organizer cookie", async () => {
    const mem = createMemoryDb();
    mem.seedParty({ id: 9, slug: "cabin-weekend", adminToken: "host-tok" });
    mem.seedGuest({
      partyId: 9,
      name: "Mina",
      arrivalFlight: "UA 1523",
      arrivalTime: "Fri 10:45 AM",
      departureFlight: "UA 887",
      departureTime: "Mon 3:15 PM",
      dietary: "Vegetarian, no nuts",
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });
    await expect(getHostGuests("cabin-weekend")).resolves.toEqual([
      expect.objectContaining({
        name: "Mina",
        arrivalFlight: "UA 1523",
        dietary: "Vegetarian, no nuts",
      }),
    ]);

    cookieGet.mockReturnValue({ value: "guest-cookie" });
    await expect(getHostGuests("cabin-weekend")).resolves.toEqual([]);
  });
});
