import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb, schema } from "@/lib/db";

type Db = NonNullable<ReturnType<typeof getDb>>;
type Party = typeof schema.parties.$inferSelect;

export type PartyAuth =
  | { ok: true; db: Db; party: Party }
  | { ok: false; error: NextResponse };

// Load the party by slug, then accept only that party's adminToken.
// A missing slug is indistinguishable from a wrong token (always 401)
// so callers cannot enumerate trips.
export async function authorizePartyBySlug(
  request: Request,
  slug: string,
): Promise<PartyAuth> {
  const db = getDb();
  if (!db) {
    return {
      ok: false,
      error: NextResponse.json({ error: "Database not configured" }, { status: 503 }),
    };
  }

  const [party] = await db
    .select()
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);

  const denied = requireAdmin(request, { partyToken: party?.adminToken ?? undefined });
  if (denied) return { ok: false, error: denied };

  if (!party) {
    return {
      ok: false,
      error: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }

  return { ok: true, db, party };
}
