import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb, schema } from "@/lib/db";

type Db = NonNullable<ReturnType<typeof getDb>>;
type Party = typeof schema.parties.$inferSelect;

export type PartyAuthRow = {
  id: number;
  slug: string;
  adminToken: string | null;
};

export type PartyAuth<T extends PartyAuthRow = PartyAuthRow> =
  | { ok: true; db: Db; party: T }
  | { ok: false; error: NextResponse };

const AUTH_COLUMNS = {
  id: schema.parties.id,
  slug: schema.parties.slug,
  adminToken: schema.parties.adminToken,
};

async function loadParty(
  db: Db,
  slug: string,
  content: boolean,
): Promise<Party | PartyAuthRow | undefined> {
  if (content) {
    const [party] = await db
      .select()
      .from(schema.parties)
      .where(eq(schema.parties.slug, slug))
      .limit(1);
    return party;
  }
  const [party] = await db
    .select(AUTH_COLUMNS)
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);
  return party;
}

// Load the party by slug, then accept only that party's adminToken.
// A missing slug is indistinguishable from a wrong token (always 401)
// so callers cannot enumerate trips.
// Default select is id/slug/adminToken (no jsonb). GET/PATCH pass { content: true }.
export async function authorizePartyBySlug(
  request: Request,
  slug: string,
  options: { content: true },
): Promise<PartyAuth<Party>>;
export async function authorizePartyBySlug(
  request: Request,
  slug: string,
  options?: { content?: false },
): Promise<PartyAuth<PartyAuthRow>>;
export async function authorizePartyBySlug(
  request: Request,
  slug: string,
  options?: { content?: boolean },
): Promise<PartyAuth<Party> | PartyAuth<PartyAuthRow>> {
  const db = getDb();
  if (!db) {
    return {
      ok: false,
      error: NextResponse.json({ error: "Database not configured" }, { status: 503 }),
    };
  }

  const party = await loadParty(db, slug, options?.content === true);

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
