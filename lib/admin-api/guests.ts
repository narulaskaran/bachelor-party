import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authorizePartyBySlug } from "@/lib/authorize-party";
import { schema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

// GET /api/admin/trips/:slug/guests — RSVPs submitted for this trip.
export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const auth = await authorizePartyBySlug(request, slug);
  if (!auth.ok) return auth.error;

  const guests = await auth.db
    .select()
    .from(schema.guests)
    .where(eq(schema.guests.partyId, auth.party.id))
    .orderBy(schema.guests.name);

  return NextResponse.json({
    guests: guests.map((guest) => {
      const { guestToken, ...publicGuest } = guest;
      void guestToken;
      return publicGuest;
    }),
  });
}
