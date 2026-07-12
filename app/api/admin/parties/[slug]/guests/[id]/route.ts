import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; id: string }> };

// DELETE /api/admin/parties/:slug/guests/:id — remove one guest RSVP.
export async function DELETE(request: Request, { params }: Params) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { slug, id } = await params;
  const guestId = Number(id);
  if (!Number.isInteger(guestId)) {
    return NextResponse.json({ error: "Invalid guest id" }, { status: 400 });
  }

  const [party] = await db
    .select({ id: schema.parties.id })
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const deleted = await db
    .delete(schema.guests)
    .where(and(eq(schema.guests.id, guestId), eq(schema.guests.partyId, party.id)))
    .returning({ id: schema.guests.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: guestId });
}
