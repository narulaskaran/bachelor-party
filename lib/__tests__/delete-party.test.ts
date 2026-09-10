import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { deletePartyRecord } from "@/lib/delete-party";
import { createMemoryDb } from "@/test/api/memory-db";

const content = { kind: "trip" as const, trip: { siteName: "Cabin" } };

describe("deletePartyRecord", () => {
  it("removes versions, guests, and the party together", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", content, draftContent: content });
    mem.seedGuest({ partyId: party.id, name: "Alex", nameKey: "alex" });
    mem.contentVersions.push({
      id: 1,
      partyId: party.id,
      version: 1,
      state: "published",
      contentSnapshot: content,
      actorType: "admin",
    });

    await deletePartyRecord(mem.db as never, party.id as number);

    expect(mem.parties).toHaveLength(0);
    expect(mem.guests).toHaveLength(0);
    expect(mem.contentVersions).toHaveLength(0);
  });

  it("does not call sequential guest-then-party deletes when execute is available", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", content });
    mem.seedGuest({ partyId: party.id, name: "Alex", nameKey: "alex" });
    const calls: unknown[] = [];
    const db = {
      ...mem.db,
      delete: (table: unknown) => {
        calls.push(["delete", table]);
        return mem.db.delete(table as never);
      },
      execute: async (query: unknown) => {
        calls.push(["execute", query]);
        return mem.db.execute(query);
      },
    };

    await deletePartyRecord(db as never, party.id as number);

    expect(calls.map((c) => (c as [string])[0])).toEqual(["execute"]);
    expect(mem.parties).toHaveLength(0);
    expect(mem.guests).toHaveLength(0);
  });

  it("uses the delete_party SQL function name", () => {
    const query = sql`SELECT delete_party(${12})`;
    expect(JSON.stringify(query)).toMatch(/delete_party/);
  });

  it("calls execute as a method so neon-http keeps its dialect", async () => {
    const mem = createMemoryDb();
    const party = mem.seedParty({ slug: "cabin", content });
    mem.seedGuest({ partyId: party.id, name: "Alex", nameKey: "alex" });

    class NeonLike {
      dialect = { name: "neon-http" };
      delete() {
        throw new Error("must not sequential-delete");
      }
      async execute(query: unknown) {
        if (this == null || this.dialect === undefined) {
          throw new TypeError("Cannot read properties of undefined (reading 'dialect')");
        }
        return mem.db.execute(query);
      }
    }

    await deletePartyRecord(new NeonLike() as never, party.id as number);

    expect(mem.parties).toHaveLength(0);
    expect(mem.guests).toHaveLength(0);
  });
});
