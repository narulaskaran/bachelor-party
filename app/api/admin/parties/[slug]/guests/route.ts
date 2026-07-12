import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

// GET /api/admin/parties/:slug/guests — RSVPs submitted for this party.
export async function GET(request: Request, { params }: Params) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { slug } = await params;
  const [party] = await db
    .select({ id: schema.parties.id })
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const guests = await db
    .select()
    .from(schema.guests)
    .where(eq(schema.guests.partyId, party.id))
    .orderBy(schema.guests.name);

  return NextResponse.json({ guests });
}
