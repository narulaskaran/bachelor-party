import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb, schema } from "@/lib/db";
import { updatePartySchema } from "@/lib/party-schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

// GET /api/admin/parties/:slug — returns the full party record + its admin_token.
// Auth: validates bearer token against ADMIN_API_TOKEN (superadmin override) or
// the returned party's admin_token (per-party auth). If global token is not set
// on this request, checks the retrieved row's admin_token for a match.
export async function GET(request: Request, ctx: Params) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { slug }: { slug: string } = await ctx.params;
  const [party] = await db
    .select({
      id: schema.parties.id,
      slug: schema.parties.slug,
      adminToken: schema.parties.adminToken,
      content: schema.parties.content,
      createdAt: schema.parties.createdAt,
      updatedAt: schema.parties.updatedAt,
    })
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  // Global token always wins as superadmin override. If denied there, check
  // the party's own admin_token for per-party admins.
  let denied = requireAdmin(request);
  if (denied) {
    denied = requireAdmin(request, { partyToken: party.adminToken ?? undefined });
  }
  if (denied) return denied;

  return NextResponse.json({
    party: {
      id: party.id,
      slug: party.slug,
      content: party.content,
      adminToken: party.adminToken ?? null,
      createdAt: party.createdAt,
      updatedAt: party.updatedAt,
    },
  });
}

// PATCH /api/admin/parties/:slug — update password, content, or admin_token.
export async function PATCH(request: Request, { params }: Params) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

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

  // Validate auth on the target row before updating.
  const { slug }: { slug: string } = await params;
  const [party] = await db
    .select({ adminToken: schema.parties.adminToken })
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);

  let denied: NextResponse | null;
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }
  denied = requireAdmin(request);
  if (denied) {
    denied = requireAdmin(request, { partyToken: party.adminToken ?? undefined });
  }
  if (denied) return denied;

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
export async function DELETE(request: Request, ctx: Params) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // Validate auth on the target row before deleting.
  const { slug }: { slug: string } = await ctx.params;
  const [party] = await db
    .select({ id: schema.parties.id, adminToken: schema.parties.adminToken })
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  let denied = requireAdmin(request);
  if (denied) {
    denied = requireAdmin(request, { partyToken: party.adminToken ?? undefined });
  }
  if (denied) return denied;

  try {
    await db.delete(schema.guests).where(eq(schema.guests.partyId, party.id));
    await db.delete(schema.parties).where(eq(schema.parties.id, party.id));
    return NextResponse.json({ deleted: slug });
  } catch (err) {
    console.error("delete party failed", err);
    return NextResponse.json({ error: "Failed to delete party" }, { status: 500 });
  }
}
