import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authorizePartyBySlug } from "@/lib/authorize-party";
import { schema } from "@/lib/db";
import { guestsToCsv } from "@/lib/roster-csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

// GET /api/admin/trips/:slug/guests/export — organizer-only FULL-detail guest
// roster as a CSV download (P2-2). Same bearer-token gate as every other
// /api/admin route: only the trip's adminToken authorizes it. Guest passwords
// and guest tokens are never accepted here, and the payload is built from an
// explicit column allowlist so no tokens or host keys can leak into it.
export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  let auth: Awaited<ReturnType<typeof authorizePartyBySlug>>;
  try {
    auth = await authorizePartyBySlug(request, slug);
  } catch (err) {
    console.error("guest roster export failed", err);
    return NextResponse.json({ error: "Failed to export guest roster" }, { status: 500 });
  }
  if (!auth.ok) return auth.error;

  let guests;
  try {
    guests = await auth.db
      .select()
      .from(schema.guests)
      .where(eq(schema.guests.partyId, auth.party.id))
      .orderBy(schema.guests.name);
  } catch (err) {
    console.error("guest roster export query failed", err);
    return NextResponse.json({ error: "Failed to export guest roster" }, { status: 500 });
  }

  const csv = guestsToCsv(guests);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}-guest-roster.csv"`,
      "cache-control": "no-store",
    },
  });
}
