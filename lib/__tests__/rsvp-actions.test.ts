import { describe, it, expect, afterEach, vi } from "vitest";
import { createMemoryDb } from "@/test/api/memory-db";
import { getDb } from "@/lib/db";
import { getCurrentParty } from "@/lib/current-party";
import { RSVP_COOKIE } from "@/lib/merge-guest";
import { DEMO_PARTY, DEMO_RSVP_MESSAGE } from "@/lib/demo-party";

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

vi.mock("@/lib/current-party", () => ({
  getCurrentParty: vi.fn(),
}));

const TOKEN_ALEX = "a".repeat(32);
const TOKEN_SAM = "b".repeat(32);

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

function mockParty(mem: ReturnType<typeof createMemoryDb>, partyId = 1) {
  const party = mem.seedParty({
    id: partyId,
    slug: "qa-tester-e2e",
    content: {
      trip: { siteName: "QA", airport: "JAC" },
      activities: { ifTimeAllows: [{ slug: "rafting", name: "Rafting" }] },
    },
  });
  vi.mocked(getDb).mockReturnValue(mem.db as never);
  vi.mocked(getCurrentParty).mockResolvedValue({
    partyId: party.id as number,
    slug: "qa-tester-e2e",
    content: {
      trip: { siteName: "QA", airport: "JAC" },
      activities: { ifTimeAllows: [{ slug: "rafting", name: "Rafting" }] },
    },
  });
  return party;
}

describe("submitGuestInfo merge upsert", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
    vi.mocked(getCurrentParty).mockReset();
    cookieStore.get.mockReset();
    cookieStore.set.mockReset();
  });

  it("does not wipe flights, phone, or notes when only dietary changes", async () => {
    const { submitGuestInfo } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    const party = mockParty(mem);
    mem.seedGuest({
      partyId: party.id,
      guestToken: TOKEN_ALEX,
      name: "Alex",
      nameKey: "alex",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      arrivalTime: "Fri, 10:45 AM",
      departureFlight: "UA 887",
      departureTime: "Mon, 3:15 PM",
      dietary: "nuts",
      notes: "landing late",
      activityPrefs: { rafting: "hyped" },
    });
    cookieStore.get.mockReturnValue({ value: TOKEN_ALEX });

    const result = await submitGuestInfo(
      null,
      form({ name: "Alex", dietary: "vegetarian" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mem.guests).toHaveLength(1);
    expect(mem.guests[0]).toMatchObject({
      name: "Alex",
      guestToken: TOKEN_ALEX,
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      arrivalTime: "Fri, 10:45 AM",
      departureFlight: "UA 887",
      departureTime: "Mon, 3:15 PM",
      dietary: "vegetarian",
      notes: "landing late",
      activityPrefs: { rafting: "hyped" },
    });
    expect(cookieStore.set).toHaveBeenCalledWith(
      RSVP_COOKIE,
      TOKEN_ALEX,
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });

  it("clears phone when the prefilled form explicitly empties it", async () => {
    const { submitGuestInfo } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    const party = mockParty(mem);
    mem.seedGuest({
      partyId: party.id,
      guestToken: TOKEN_ALEX,
      name: "Alex",
      nameKey: "alex",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      notes: "landing late",
    });
    cookieStore.get.mockReturnValue({ value: TOKEN_ALEX });

    const result = await submitGuestInfo(
      null,
      form({
        name: "Alex",
        "had:phone": "1",
        phone: "",
        arrivalFlight: "UA 1523",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mem.guests[0]).toMatchObject({
      phone: null,
      arrivalFlight: "UA 1523",
      notes: "landing late",
    });
  });

  it("prefills the session guest from the guest-token cookie", async () => {
    const { getGuests, getRsvpPrefill } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    const party = mockParty(mem);
    mem.seedGuest({
      partyId: party.id,
      guestToken: TOKEN_SAM,
      name: "Sam",
      nameKey: "sam",
      phone: "111",
    });
    mem.seedGuest({
      partyId: party.id,
      guestToken: TOKEN_ALEX,
      name: "Alex",
      nameKey: "alex",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      notes: "landing late",
    });
    cookieStore.get.mockReturnValue({ value: TOKEN_ALEX });

    const guests = await getGuests();
    const prefill = await getRsvpPrefill(guests);
    expect(prefill).toMatchObject({
      name: "Alex",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      notes: "landing late",
    });
    expect(prefill?.nameKey).toBe("alex");
  });

  it("does not prefill another guest who shares the same display name", async () => {
    const { getGuests, getRsvpPrefill } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    const party = mockParty(mem);
    mem.seedGuest({
      partyId: party.id,
      guestToken: TOKEN_ALEX,
      name: "QA Guest",
      nameKey: "qa guest",
      notes: "original",
    });
    mem.seedGuest({
      partyId: party.id,
      guestToken: TOKEN_SAM,
      name: "QA Guest",
      nameKey: "qa guest",
      notes: "impostor",
    });
    cookieStore.get.mockReturnValue({ value: TOKEN_ALEX });

    const prefill = await getRsvpPrefill(await getGuests());
    expect(prefill?.notes).toBe("original");
  });

  it("inserts a new guest when the name is new", async () => {
    const { submitGuestInfo } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    mockParty(mem);

    const result = await submitGuestInfo(
      null,
      form({ name: "Sam", phone: "555-0199", notes: "driving" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mem.guests).toHaveLength(1);
    expect(mem.guests[0]).toMatchObject({
      name: "Sam",
      nameKey: "sam",
      phone: "555-0199",
      notes: "driving",
      arrivalFlight: null,
    });
    expect(mem.guests[0].guestToken).toMatch(/^[a-f0-9]{32}$/);
    expect(cookieStore.set).toHaveBeenCalledWith(
      RSVP_COOKIE,
      mem.guests[0].guestToken,
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });

  it("does not overwrite another guest who submitted the same display name", async () => {
    const { submitGuestInfo } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    const party = mockParty(mem);
    mem.seedGuest({
      partyId: party.id,
      guestToken: TOKEN_ALEX,
      name: "QA Guest",
      nameKey: "qa guest",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      notes: "landing late",
    });
    cookieStore.get.mockReturnValue(undefined);

    const result = await submitGuestInfo(
      null,
      form({
        name: "QA Guest",
        notes: "impostor",
        arrivalFlight: "DL 1",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mem.guests).toHaveLength(2);
    expect(mem.guests[0]).toMatchObject({
      guestToken: TOKEN_ALEX,
      name: "QA Guest",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      notes: "landing late",
    });
    expect(mem.guests[1]).toMatchObject({
      name: "QA Guest",
      nameKey: "qa guest",
      notes: "impostor",
      arrivalFlight: "DL 1",
    });
    expect(mem.guests[1].guestToken).not.toBe(TOKEN_ALEX);
  });

  it("lets the original guest update their own row after a name collision", async () => {
    const { submitGuestInfo } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    const party = mockParty(mem);
    mem.seedGuest({
      partyId: party.id,
      guestToken: TOKEN_ALEX,
      name: "QA Guest",
      nameKey: "qa guest",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      notes: "landing late",
    });
    mem.seedGuest({
      partyId: party.id,
      guestToken: TOKEN_SAM,
      name: "QA Guest",
      nameKey: "qa guest",
      notes: "impostor",
    });
    cookieStore.get.mockReturnValue({ value: TOKEN_ALEX });

    const result = await submitGuestInfo(
      null,
      form({ name: "QA Guest", dietary: "vegetarian" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mem.guests).toHaveLength(2);
    expect(mem.guests[0]).toMatchObject({
      guestToken: TOKEN_ALEX,
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      notes: "landing late",
      dietary: "vegetarian",
    });
    expect(mem.guests[1]).toMatchObject({
      guestToken: TOKEN_SAM,
      notes: "impostor",
    });
  });

  it("ignores a leftover name-string cookie and inserts instead of clobbering", async () => {
    const { submitGuestInfo } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    const party = mockParty(mem);
    mem.seedGuest({
      partyId: party.id,
      guestToken: TOKEN_ALEX,
      name: "Alex",
      nameKey: "alex",
      notes: "original",
    });
    cookieStore.get.mockReturnValue({ value: "alex" });

    const result = await submitGuestInfo(
      null,
      form({ name: "Alex", notes: "new browser" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mem.guests).toHaveLength(2);
    expect(mem.guests[0].notes).toBe("original");
    expect(mem.guests[1].notes).toBe("new browser");
  });
});

describe("sample trip RSVP", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
    vi.mocked(getCurrentParty).mockReset();
    cookieStore.get.mockReset();
    cookieStore.set.mockReset();
  });

  it("does not save and never consults a logged-in trip cookie", async () => {
    const { submitSampleGuestInfo } = await import("@/lib/rsvp-actions");
    const result = await submitSampleGuestInfo();
    expect(result).toEqual({
      ok: false,
      error: DEMO_RSVP_MESSAGE,
    });
    expect(getCurrentParty).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("submitGuestInfo does not persist when the current trip is the demo fixture", async () => {
    const { submitGuestInfo } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    vi.mocked(getCurrentParty).mockResolvedValue({
      partyId: "demo",
      slug: "demo",
      content: DEMO_PARTY,
    });

    const result = await submitGuestInfo(null, form({ name: "Alex" }));
    expect(result).toEqual({ ok: false, error: DEMO_RSVP_MESSAGE });
    expect(mem.guests).toHaveLength(0);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
