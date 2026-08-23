import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { PartyContent } from "@/lib/party-types";

type Db = NonNullable<ReturnType<typeof getDb>>;

export type RecordContentVersionInput = {
  partyId: number;
  state: (typeof schema.contentVersions.$inferInsert)["state"];
  content: PartyContent;
  actorType: (typeof schema.contentVersions.$inferInsert)["actorType"];
  /** Credential identifier (fingerprint), never the raw secret. */
  actorId?: string | null;
  changeSummary?: string | null;
  publishedAt?: Date | null;
};

/**
 * Short one-way fingerprint of a credential for the audit trail. Only the
 * hash prefix is stored — never the raw token — so leaked audit records
 * cannot authenticate anyone.
 */
export function credentialFingerprint(token: string): string {
  const digest = createHash("sha256").update(token).digest("hex");
  return `sha256:${digest.slice(0, 12)}`;
}

/**
 * Append one immutable row to content_versions with a FULL content snapshot
 * (not a diff). Version numbers are per-party monotonic. Best-effort: an
 * audit-write failure is logged but never blocks the underlying save or
 * publish — the trail must not become the reason a trip becomes unsavable.
 * Rows are never updated or deleted; the 0006 migration enforces this with
 * database triggers too.
 */
export async function recordContentVersion(
  db: Db,
  input: RecordContentVersionInput,
): Promise<void> {
  try {
    // Per-party head version. Small tables; MAX-in-JS keeps this portable
    // across the real driver and the in-memory test double.
    const heads = await db
      .select({ version: schema.contentVersions.version })
      .from(schema.contentVersions)
      .where(eq(schema.contentVersions.partyId, input.partyId));
    const baseVersion = heads.reduce((max, row) => Math.max(max, row.version), 0);

    await db.insert(schema.contentVersions).values({
      partyId: input.partyId,
      version: baseVersion + 1,
      state: input.state,
      contentSnapshot: input.content,
      ...(baseVersion > 0 ? { baseVersion } : {}),
      actorType: input.actorType,
      ...(input.actorId ? { actorId: input.actorId } : {}),
      ...(input.changeSummary ? { changeSummary: input.changeSummary } : {}),
      ...(input.publishedAt ? { publishedAt: input.publishedAt } : {}),
    });
  } catch (err) {
    console.error("recordContentVersion failed", err);
  }
}
