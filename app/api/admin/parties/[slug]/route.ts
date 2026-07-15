import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb, schema } from "@/lib/db";
import { updatePartySchema } from "@/lib/party-schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

// GET /api/admin/parties/:slug — full record, including password and content.
export async function GET(request: Request, { params }: Params) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { slug } = await params;
  const [party] = await db
    .select()
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  return NextResponse.json({ party });
}

// PATCH /api/admin/parties/:slug — update password and/or content.
export async function PATCH(request: Request, { params }: Params) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { slug } = await params;
  const json = await request.json().catch(() => null);
  const parsed = updatePartySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // If password is being changed, check it doesn't collide with another party.
  if (parsed.data.password) {
    const [conflict] = await db
      .select({ slug: schema.parties.slug })
      .from(schema.parties)
      .where(eq(schema.parties.password, parsed.data.password))
      .limit(1);
    if (conflict && conflict.slug !== slug) {
      return NextResponse.json(
        { error: "Password already in use by another party" },
        { status: 409 }
      );
    }
  }

  try {
    const [party] = await db
      .update(schema.parties)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.parties.slug, slug))
      .returning();
    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }
    return NextResponse.json({ party });
  } catch (err) {
    console.error("update party failed", err);
    return NextResponse.json({ error: "Failed to update party" }, { status: 500 });
  }
}

// DELETE /api/admin/parties/:slug — removes the party and its guest RSVPs.
export async function DELETE(request: Request, { params }: Params) {
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

  try {
    await db.delete(schema.guests).where(eq(schema.guests.partyId, party.id));
    await db.delete(schema.parties).where(eq(schema.parties.id, party.id));
    return NextResponse.json({ deleted: slug });
  } catch (err) {
    console.error("delete party failed", err);
    return NextResponse.json({ error: "Failed to delete party" }, { status: 500 });
  }
}
