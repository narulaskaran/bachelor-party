/** Tests for the admin party create/edit server actions (Phase 2, issue #29). */

import { describe, it, expect, afterEach, vi } from "vitest";
import { createPartyAction, updatePartyAction } from "@/app/admin/(protected)/parties/actions";
import { getDb } from "@/lib/db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

const validContent = {
  trip: {
    groomName: "Alex",
    siteName: "Alex's Big Send",
    tagline: "One last ride",
    startDate: "2026-09-04",
    endDate: "2026-09-07",
    dateLabel: "Sep 4-7, 2026",
    location: "Denver, CO",
    coordinates: "39.7392,-104.9903",
    elevation: "5280 ft",
    airport: "DEN",
  },
  lodging: {
    name: "The Cabin",
    url: "https://example.com",
    address: "123 Main St",
    mapsUrl: "https://maps.example.com",
    bedrooms: 4,
    beds: 6,
    bathrooms: 2,
    totalCost: "$2000",
    amenities: ["hot tub", "grill"],
    driveFromAirport: "1.5 hours",
  },
  schedule: [],
  activities: { core: [], ifTimeAllows: [], backups: [] },
  actionItems: [],
};

function contentFormData(overrides: Record<string, string> = {}, content: unknown = validContent) {
  const fd = new FormData();
  fd.set("content", JSON.stringify(content));
  for (const [key, value] of Object.entries(overrides)) fd.set(key, value);
  return fd;
}

// Chainable stand-in matching the shapes actions.ts actually calls.
function fakeDb(options: {
  selectRows?: Record<string, unknown>[];
  insertRows?: Record<string, unknown>[];
  updateRows?: Record<string, unknown>[];
  throwOnInsert?: boolean;
  throwOnUpdate?: boolean;
}) {
  const selectRows = options.selectRows ?? [];
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => selectRows,
        }),
      }),
    }),
    insert: () => ({
      values: () => {
        if (options.throwOnInsert) throw new Error("db insert failed");
        return {};
      },
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => {
            if (options.throwOnUpdate) throw new Error("db update failed");
            return options.updateRows ?? [];
          },
        }),
      }),
    }),
  };
}

async function expectRedirectTo(promise: Promise<unknown>, path: string) {
  await expect(promise).rejects.toMatchObject({ digest: expect.stringContaining(path) });
}

describe("createPartyAction", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("returns an error when the database is unavailable", async () => {
    vi.mocked(getDb).mockReturnValue(null);
    const state = await createPartyAction({}, contentFormData({ slug: "denver2k26", password: "secretpw" }));
    expect(state.error).toMatch(/database/i);
  });

  it("returns an error for invalid JSON in the content field", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb({}) as never);
    const fd = new FormData();
    fd.set("content", "{not valid json");
    fd.set("slug", "denver2k26");
    fd.set("password", "secretpw");
    const state = await createPartyAction({}, fd);
    expect(state.error).toMatch(/JSON/);
  });

  it("returns validation issues for an invalid payload", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb({}) as never);
    const state = await createPartyAction(
      {},
      contentFormData({ slug: "Not A Valid Slug!", password: "secretpw" })
    );
    expect(state.error).toBeTruthy();
    expect(state.issues?.length).toBeGreaterThan(0);
  });

  it("rejects a duplicate slug", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb({ selectRows: [{ id: 1 }] }) as never);
    const state = await createPartyAction(
      {},
      contentFormData({ slug: "denver2k26", password: "secretpw" })
    );
    expect(state.error).toMatch(/already exists/);
  });

  it("rejects a duplicate password", async () => {
    // First select (slug lookup) empty, second select (password lookup) has a hit.
    let call = 0;
    const db = fakeDb({});
    db.select = () => ({
      from: () => ({
        where: () => ({
          limit: async () => (call++ === 0 ? [] : [{ id: 99 }]),
        }),
      }),
    });
    vi.mocked(getDb).mockReturnValue(db as never);
    const state = await createPartyAction(
      {},
      contentFormData({ slug: "denver2k26", password: "secretpw" })
    );
    expect(state.error).toMatch(/password already in use/i);
  });

  it("creates the party and redirects to /admin on success", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb({ selectRows: [] }) as never);
    await expectRedirectTo(
      createPartyAction({}, contentFormData({ slug: "denver2k26", password: "secretpw" })),
      "/admin"
    );
  });
});

describe("updatePartyAction", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("returns an error when the database is unavailable", async () => {
    vi.mocked(getDb).mockReturnValue(null);
    const state = await updatePartyAction("denver2k26", {}, contentFormData());
    expect(state.error).toMatch(/database/i);
  });

  it("returns an error for invalid JSON in the content field", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb({}) as never);
    const fd = new FormData();
    fd.set("content", "{not valid json");
    const state = await updatePartyAction("denver2k26", {}, fd);
    expect(state.error).toMatch(/JSON/);
  });

  it("rejects a password that collides with a different party", async () => {
    vi.mocked(getDb).mockReturnValue(
      fakeDb({ selectRows: [{ slug: "some-other-party" }] }) as never
    );
    const state = await updatePartyAction(
      "denver2k26",
      {},
      contentFormData({ password: "collidingpw" })
    );
    expect(state.error).toMatch(/password already in use/i);
  });

  it("allows a password change that only collides with itself", async () => {
    vi.mocked(getDb).mockReturnValue(
      fakeDb({ selectRows: [{ slug: "denver2k26" }], updateRows: [{ slug: "denver2k26" }] }) as never
    );
    await expectRedirectTo(
      updatePartyAction("denver2k26", {}, contentFormData({ password: "samepw" })),
      "/admin"
    );
  });

  it("returns 'Party not found' when the slug doesn't match any row", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb({ selectRows: [], updateRows: [] }) as never);
    const state = await updatePartyAction("nonexistent", {}, contentFormData());
    expect(state.error).toMatch(/not found/i);
  });

  it("updates content-only (no password) and redirects to /admin on success", async () => {
    vi.mocked(getDb).mockReturnValue(
      fakeDb({ updateRows: [{ slug: "denver2k26" }] }) as never
    );
    await expectRedirectTo(updatePartyAction("denver2k26", {}, contentFormData()), "/admin");
  });
});
