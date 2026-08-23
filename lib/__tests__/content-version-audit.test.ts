/** P2-3: host draft save and publish each append an immutable content_versions row. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { hostCookieValue } from "@/lib/host-auth";
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

import { publishHostDraft, saveHostDraft } from "@/lib/host-access";

const baseContent = {
  kind: "trip" as const,
  trip: { siteName: "Cabin Weekend" },
  draftReview: { acknowledged: true, facts: [] },
};

describe("content_versions rows in the host draft/publish flow", () => {
  afterEach(() => {
    setCookie.mockReset();
    cookieGet.mockReset();
    vi.mocked(getDb).mockReset();
  });

  function seededMem() {
    const mem = createMemoryDb();
    mem.seedParty({
      id: 9,
      slug: "cabin-weekend",
      adminToken: "host-tok",
      guestToken: "a".repeat(32),
      content: { kind: "trip", trip: { siteName: "Old published" } },
      draftContent: baseContent,
      published: false,
    });
    vi.mocked(getDb).mockReturnValue(mem.db as never);
    return mem;
  }

  it("saveHostDraft appends a draft version with the full snapshot and host actor", async () => {
    const mem = seededMem();
    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });

    const saved = await saveHostDraft("cabin-weekend", baseContent);
    expect(saved.ok).toBe(true);

    expect(mem.contentVersions).toHaveLength(1);
    const row = mem.contentVersions[0];
    expect(row.partyId).toBe(9);
    expect(row.version).toBe(1);
    expect(row.state).toBe("draft");
    expect(row.actorType).toBe("host");
    expect(row.changeSummary).toBe("draft saved");
    expect(row.contentSnapshot).toMatchObject({ trip: { siteName: "Cabin Weekend" } });
  });

  it("publishHostDraft appends a published version with publishedAt after the draft row", async () => {
    const mem = seededMem();
    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });

    await saveHostDraft("cabin-weekend", baseContent);
    const result = await publishHostDraft("cabin-weekend");
    expect(result.ok).toBe(true);

    expect(mem.contentVersions).toHaveLength(2);
    const [, publishedRow] = mem.contentVersions;
    expect(publishedRow.version).toBe(2);
    expect(publishedRow.state).toBe("published");
    expect(publishedRow.baseVersion).toBe(1);
    expect(publishedRow.publishedAt).toBeInstanceOf(Date);
    // Published snapshot strips the internal draft review marker.
    expect(
      (publishedRow.contentSnapshot as { draftReview?: unknown }).draftReview,
    ).toBeUndefined();
  });

  it("an unauthenticated save writes no version rows", async () => {
    const mem = seededMem();
    cookieGet.mockReturnValue(undefined);

    const saved = await saveHostDraft("cabin-weekend", baseContent);
    expect(saved.ok).toBe(false);
    expect(mem.contentVersions).toHaveLength(0);
  });

  it("audit rows carry no raw host credentials anywhere in the payload", async () => {
    const mem = seededMem();
    cookieGet.mockReturnValue({ value: await hostCookieValue(9, "host-tok") });

    await saveHostDraft("cabin-weekend", baseContent);
    await publishHostDraft("cabin-weekend");

    expect(JSON.stringify(mem.contentVersions)).not.toContain("host-tok");
  });
});
