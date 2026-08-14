import { describe, it, expect, afterEach, vi } from "vitest";
import { createMemoryDb } from "@/test/api/memory-db";
import { getDb } from "@/lib/db";
import { getCurrentParty } from "@/lib/current-party";
import { RSVP_COOKIE } from "@/lib/merge-guest";

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

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
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
    const party = mem.seedParty({
      id: 1,
      slug: "qa-tester-e2e",
      content: { trip: { siteName: "QA", airport: "JAC" } },
    });
    mem.seedGuest({
      partyId: party.id,
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
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    vi.mocked(getCurrentParty).mockResolvedValue({
      partyId: party.id as number,
      slug: "qa-tester-e2e",
      content: {
        trip: { siteName: "QA", airport: "JAC" },
        activities: { ifTimeAllows: [{ slug: "rafting", name: "Rafting" }] },
      },
    });

    const result = await submitGuestInfo(
      null,
      form({ name: "Alex", dietary: "vegetarian" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mem.guests).toHaveLength(1);
    expect(mem.guests[0]).toMatchObject({
      name: "Alex",
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
      "alex",
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });

  it("clears phone when the prefilled form explicitly empties it", async () => {
    const { submitGuestInfo } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    const party = mem.seedParty({ id: 1, slug: "qa-tester-e2e" });
    mem.seedGuest({
      partyId: party.id,
      name: "Alex",
      nameKey: "alex",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      notes: "landing late",
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    vi.mocked(getCurrentParty).mockResolvedValue({
      partyId: party.id as number,
      slug: "qa-tester-e2e",
      content: { trip: { siteName: "QA" } },
    });

    const result = await submitGuestInfo(
      null,
      form({
        name: "Alex",
        prefillNameKey: "alex",
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

  it("prefills the session guest from the RSVP cookie", async () => {
    const { getGuests, getRsvpPrefill } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    const party = mem.seedParty({ id: 1, slug: "qa-tester-e2e" });
    mem.seedGuest({
      partyId: party.id,
      name: "Sam",
      nameKey: "sam",
      phone: "111",
    });
    mem.seedGuest({
      partyId: party.id,
      name: "Alex",
      nameKey: "alex",
      phone: "555-0100",
      arrivalFlight: "UA 1523",
      notes: "landing late",
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    vi.mocked(getCurrentParty).mockResolvedValue({
      partyId: party.id as number,
      slug: "qa-tester-e2e",
      content: { trip: { siteName: "QA" } },
    });
    cookieStore.get.mockReturnValue({ value: "alex" });

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

  it("inserts a new guest when the name is new", async () => {
    const { submitGuestInfo } = await import("@/lib/rsvp-actions");
    const mem = createMemoryDb();
    const party = mem.seedParty({ id: 1, slug: "qa-tester-e2e" });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    vi.mocked(getCurrentParty).mockResolvedValue({
      partyId: party.id as number,
      slug: "qa-tester-e2e",
      content: { trip: { siteName: "QA" } },
    });

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
  });
});

describe("sample trip RSVP", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
    vi.mocked(getCurrentParty).mockReset();
  });

  it("does not save and never consults a logged-in trip cookie", async () => {
    const { submitSampleGuestInfo } = await import("@/lib/rsvp-actions");
    const result = await submitSampleGuestInfo();
    expect(result).toEqual({
      ok: false,
      error: "Demo mode — this sample trip doesn't save RSVPs.",
    });
    expect(getCurrentParty).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });
});
