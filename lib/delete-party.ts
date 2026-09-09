import { eq, sql } from "drizzle-orm";
import { schema } from "@/lib/db";

type Db = {
  delete: (table: unknown) => {
    where: (cond: unknown) => Promise<unknown> | { then: Promise<unknown>["then"] };
  };
  execute?: (query: unknown) => Promise<unknown>;
};

/**
 * Delete a party and its guests + content_versions together.
 * On Neon this is one `delete_party()` call (atomic). Memory tests fall back
 * to in-order deletes of versions, guests, then the party row.
 */
export async function deletePartyRecord(db: Db, partyId: number): Promise<void> {
  const execute = db.execute;
  if (typeof execute === "function") {
    await execute(sql`SELECT delete_party(${partyId})`);
    return;
  }

  await db.delete(schema.contentVersions).where(eq(schema.contentVersions.partyId, partyId));
  await db.delete(schema.guests).where(eq(schema.guests.partyId, partyId));
  await db.delete(schema.parties).where(eq(schema.parties.id, partyId));
}
