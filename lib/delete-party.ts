import { eq, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { executeSql } from "@/lib/db-execute";
import { schema } from "@/lib/db";

type PartyTable = typeof schema.parties | typeof schema.guests | typeof schema.contentVersions;

type Db = {
  delete: (table: PartyTable) => {
    where: (cond: SQL | undefined) => Promise<unknown> | { then: Promise<unknown>["then"] };
  };
  execute?: (query: string | SQLWrapper) => Promise<unknown> | { then: Promise<unknown>["then"] };
};

/**
 * Delete a party and its guests + content_versions together.
 * On Neon this is one `delete_party()` call (atomic). Memory tests fall back
 * to in-order deletes of versions, guests, then the party row.
 */
export async function deletePartyRecord(db: Db, partyId: number): Promise<void> {
  if (await executeSql(db, sql`SELECT delete_party(${partyId})`)) return;

  await db.delete(schema.contentVersions).where(eq(schema.contentVersions.partyId, partyId));
  await db.delete(schema.guests).where(eq(schema.guests.partyId, partyId));
  await db.delete(schema.parties).where(eq(schema.parties.id, partyId));
}
