import { createHash } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { PartyContent } from "@/lib/party-types";

type Db = NonNullable<ReturnType<typeof getDb>>;

/** Newest draft snapshots kept per party. All published rows are retained. */
export const CONTENT_VERSION_DRAFT_RETENTION = 20;

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

function snapshotsMatch(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

async function pruneDraftVersions(db: Db, partyId: number): Promise<void> {
  const execute = (db as { execute?: (query: unknown) => Promise<unknown> }).execute;
  if (typeof execute === "function") {
    await execute(
      sql`SELECT prune_draft_content_versions(${partyId}, ${CONTENT_VERSION_DRAFT_RETENTION})`,
    );
    return;
  }

  const rows = await db
    .select({
      id: schema.contentVersions.id,
      version: schema.contentVersions.version,
      state: schema.contentVersions.state,
    })
    .from(schema.contentVersions)
    .where(eq(schema.contentVersions.partyId, partyId));
  const extra = rows
    .filter((row) => row.state === "draft")
    .sort((a, b) => b.version - a.version)
    .slice(CONTENT_VERSION_DRAFT_RETENTION);
  for (const row of extra) {
    await db.delete(schema.contentVersions).where(eq(schema.contentVersions.id, row.id));
  }
}

/**
 * Append one content_versions row with a full content snapshot. Version
 * numbers stay per-party monotonic. Identical consecutive snapshots (same
 * state + same document) are skipped. Surplus draft rows beyond
 * CONTENT_VERSION_DRAFT_RETENTION are pruned; published rows are kept.
 * Best-effort: an audit-write failure is logged but never blocks save/publish.
 */
export async function recordContentVersion(
  db: Db,
  input: RecordContentVersionInput,
): Promise<void> {
  try {
    const [head] = await db
      .select({
        version: schema.contentVersions.version,
        state: schema.contentVersions.state,
        contentSnapshot: schema.contentVersions.contentSnapshot,
      })
      .from(schema.contentVersions)
      .where(eq(schema.contentVersions.partyId, input.partyId))
      .orderBy(desc(schema.contentVersions.version))
      .limit(1);
    const baseVersion = head?.version ?? 0;
    if (
      head &&
      head.state === input.state &&
      snapshotsMatch(head.contentSnapshot, input.content)
    ) {
      return;
    }

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
    await pruneDraftVersions(db, input.partyId);
  } catch (err) {
    console.error("recordContentVersion failed", err);
  }
}
