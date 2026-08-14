import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { authorizePartyBySlug } from "@/lib/authorize-party";
import { schema } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; id: string }> };

// DELETE /api/admin/parties/:slug/guests/:id — remove one guest RSVP.
export async function DELETE(request: Request, { params }: Params) {
  const { slug, id } = await params;
  const auth = await authorizePartyBySlug(request, slug);
  if (!auth.ok) return auth.error;

  const guestId = Number(id);
  if (!Number.isInteger(guestId)) {
    return NextResponse.json({ error: "Invalid guest id" }, { status: 400 });
  }

  const deleted = await auth.db
    .delete(schema.guests)
    .where(and(eq(schema.guests.id, guestId), eq(schema.guests.partyId, auth.party.id)))
    .returning({ id: schema.guests.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: guestId });
}
