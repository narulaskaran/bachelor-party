import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb, schema } from "@/lib/db";

type Db = NonNullable<ReturnType<typeof getDb>>;
type Party = typeof schema.parties.$inferSelect;

export type PartyAuth =
  | { ok: true; db: Db; party: Party }
  | { ok: false; error: NextResponse };

// Load the party by slug, then accept either that party's admin_token or
// the global ADMIN_API_TOKEN. Auth is resolved before 404 so a missing
// slug is indistinguishable from a wrong token to an unauthenticated caller.
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
      error: NextResponse.json({ error: "Party not found" }, { status: 404 }),
    };
  }

  return { ok: true, db, party };
}
