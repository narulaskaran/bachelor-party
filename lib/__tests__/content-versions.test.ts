import { describe, expect, it } from "vitest";
import { credentialFingerprint, recordContentVersion, CONTENT_VERSION_DRAFT_RETENTION } from "@/lib/content-versions";
import { createMemoryDb } from "@/test/api/memory-db";

const content = (siteName: string) => ({ kind: "trip" as const, trip: { siteName } });

describe("credentialFingerprint", () => {
  it("is a short one-way identifier that never contains the raw token", () => {
    const token = "super-secret-admin-token-value";
    const fp = credentialFingerprint(token);
    expect(fp).toMatch(/^sha256:[0-9a-f]{12}$/);
    expect(fp).not.toContain(token);
    expect(fp).not.toContain("secret");
  });

  it("is stable per token and distinct across tokens", () => {
    expect(credentialFingerprint("token-a")).toBe(credentialFingerprint("token-a"));
    expect(credentialFingerprint("token-a")).not.toBe(credentialFingerprint("token-b"));
  });

  it("handles the empty-token case without crashing", () => {
    expect(credentialFingerprint("")).toMatch(/^sha256:[0-9a-f]{12}$/);
  });
});

describe("recordContentVersion", () => {
  it("appends a full-snapshot draft row with version 1 and no publishedAt", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", adminToken: "tok-1" });

    await recordContentVersion(mem.db as never, {
      partyId: party.id as number,
      state: "draft",
      content: content("Cabin Weekend"),
      actorType: "host",
      changeSummary: "draft saved",
    });

    expect(mem.contentVersions).toHaveLength(1);
    const row = mem.contentVersions[0];
    expect(row.version as number).toBe(1);
    expect(row.state).toBe("draft");
    // FULL snapshot stored, not a diff.
    expect(row.contentSnapshot).toEqual(content("Cabin Weekend"));
    expect(row.actorType).toBe("host");
    expect(row.changeSummary).toBe("draft saved");
    expect(row.publishedAt ?? null).toBeNull();
  });

  it("increments versions per party and records baseVersion from the prior head", async () => {
    const mem = createMemoryDb();
    const a = mem.seedParty({ slug: "a", adminToken: "tok-a" });
    const b = mem.seedParty({ slug: "b", adminToken: "tok-b" });

    await recordContentVersion(mem.db as never, {
      partyId: a.id as number,
      state: "draft",
      content: content("A1"),
      actorType: "host",
    });
    await recordContentVersion(mem.db as never, {
      partyId: b.id as number,
      state: "draft",
      content: content("B1"),
      actorType: "host",
    });
    await recordContentVersion(mem.db as never, {
      partyId: a.id as number,
      state: "published",
      content: content("A2"),
      actorType: "host",
      publishedAt: new Date(),
    });

    const aRows = mem.contentVersions.filter((row) => row.partyId === a.id);
    const bRows = mem.contentVersions.filter((row) => row.partyId === b.id);
    expect(aRows.map((row) => row.version as number)).toEqual([1, 2]);
    expect(bRows.map((row) => row.version as number)).toEqual([1]);
    expect(aRows[1].baseVersion as number).toBe(1);
    expect(aRows[1].state).toBe("published");
    expect(aRows[1].publishedAt).toBeInstanceOf(Date);
    // First-ever version has no base.
    expect(aRows[0].baseVersion ?? null).toBeNull();
  });

  it("takes the highest existing version as head even when rows are not insertion-ordered", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", adminToken: "tok-1" });
    mem.contentVersions.push(
      {
        id: 91,
        partyId: party.id,
        version: 2,
        state: "draft",
        contentSnapshot: content("older"),
        actorType: "host",
      },
      {
        id: 90,
        partyId: party.id,
        version: 10,
        state: "published",
        contentSnapshot: content("newest"),
        actorType: "host",
      },
    );

    await recordContentVersion(mem.db as never, {
      partyId: party.id as number,
      state: "draft",
      content: content("after-head"),
      actorType: "host",
    });

    const versions = mem.contentVersions
      .filter((row) => row.partyId === party.id)
      .map((row) => row.version as number);
    expect(versions).toContain(11);
    expect(mem.selectCounts.contentVersions).toBeGreaterThanOrEqual(1);
  });

  it("records an actor credential fingerprint, never the raw secret", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", adminToken: "raw-tok-123" });

    await recordContentVersion(mem.db as never, {
      partyId: party.id as number,
      state: "published",
      content: content("Cabin Weekend"),
      actorType: "admin",
      actorId: credentialFingerprint("raw-tok-123"),
    });

    const serialized = JSON.stringify(mem.contentVersions);
    expect(serialized).not.toContain("raw-tok-123");
    expect(mem.contentVersions[0].actorId).toMatch(/^sha256:[0-9a-f]{12}$/);
  });

  it("is best-effort: an audit-write failure never throws into the save path", async () => {
    const failingDb = {
      select: () => {
        throw new Error("audit read blip");
      },
      insert: () => {
        throw new Error("audit write blip");
      },
    };

    await expect(
      recordContentVersion(failingDb as never, {
        partyId: 1,
        state: "draft",
        content: content("X"),
        actorType: "host",
      }),
    ).resolves.toBeUndefined();
  });

  it("skips a consecutive identical draft snapshot", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", adminToken: "tok-1" });

    await recordContentVersion(mem.db as never, {
      partyId: party.id as number,
      state: "draft",
      content: content("Cabin Weekend"),
      actorType: "host",
    });
    await recordContentVersion(mem.db as never, {
      partyId: party.id as number,
      state: "draft",
      content: content("Cabin Weekend"),
      actorType: "host",
    });

    expect(mem.contentVersions).toHaveLength(1);
    await recordContentVersion(mem.db as never, {
      partyId: party.id as number,
      state: "published",
      content: content("Cabin Weekend"),
      actorType: "host",
      publishedAt: new Date(),
    });
    expect(mem.contentVersions).toHaveLength(2);
    expect(mem.contentVersions.map((row) => row.state)).toEqual(["draft", "published"]);
  });

  it("keeps the newest drafts up to the retention cap and never drops published rows", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", adminToken: "tok-1" });

    await recordContentVersion(mem.db as never, {
      partyId: party.id as number,
      state: "published",
      content: content("Published v1"),
      actorType: "host",
      publishedAt: new Date(),
    });
    for (let i = 0; i < CONTENT_VERSION_DRAFT_RETENTION + 5; i++) {
      await recordContentVersion(mem.db as never, {
        partyId: party.id as number,
        state: "draft",
        content: content(`Draft ${i}`),
        actorType: "host",
      });
    }

    const drafts = mem.contentVersions.filter((row) => row.state === "draft");
    const published = mem.contentVersions.filter((row) => row.state === "published");
    expect(drafts).toHaveLength(CONTENT_VERSION_DRAFT_RETENTION);
    expect(published).toHaveLength(1);
    expect(published[0].contentSnapshot).toEqual(content("Published v1"));
    expect(drafts.map((row) => row.version as number)).toEqual(
      Array.from({ length: CONTENT_VERSION_DRAFT_RETENTION }, (_, i) => i + 2 + 5),
    );
  });

  it("prunes via execute as a method so neon-http keeps its dialect", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", adminToken: "tok-1" });

    class NeonLike {
      dialect = { name: "neon-http" };
      select = mem.db.select.bind(mem.db);
      insert = mem.db.insert.bind(mem.db);
      delete = mem.db.delete.bind(mem.db);
      async execute(query: unknown) {
        if (this == null || this.dialect === undefined) {
          throw new TypeError("Cannot read properties of undefined (reading 'dialect')");
        }
        return mem.db.execute(query);
      }
    }

    await recordContentVersion(new NeonLike() as never, {
      partyId: party.id as number,
      state: "published",
      content: content("Published v1"),
      actorType: "host",
      publishedAt: new Date(),
    });
    for (let i = 0; i < CONTENT_VERSION_DRAFT_RETENTION + 3; i++) {
      await recordContentVersion(new NeonLike() as never, {
        partyId: party.id as number,
        state: "draft",
        content: content(`Draft ${i}`),
        actorType: "host",
      });
    }

    const drafts = mem.contentVersions.filter((row) => row.state === "draft");
    expect(drafts).toHaveLength(CONTENT_VERSION_DRAFT_RETENTION);
  });
});
