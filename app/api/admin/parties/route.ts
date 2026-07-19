import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb, schema } from "@/lib/db";
import { createPartySchema } from "@/lib/party-schema";

export const dynamic = "force-dynamic";

// GET /api/admin/parties — lightweight index (no passwords, no full content).
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const rows = await db
    .select({
      id: schema.parties.id,
      slug: schema.parties.slug,
      content: schema.parties.content,
      createdAt: schema.parties.createdAt,
      updatedAt: schema.parties.updatedAt,
      guestCount: count(schema.guests.id),
    })
    .from(schema.parties)
    .leftJoin(schema.guests, eq(schema.guests.partyId, schema.parties.id))
    .groupBy(schema.parties.id)
    .orderBy(schema.parties.createdAt);

  return NextResponse.json({
    parties: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      siteName: row.content.trip.siteName,
      groomName: row.content.trip.groomName,
      dateLabel: row.content.trip.dateLabel,
      guestCount: row.guestCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  });
}

// POST /api/admin/parties — create a new party. 409 if the slug exists.
// Auto-generates an `admin_token` for the new party (32-char hex). Returns it
// in the response so callers can persist it as the per-party admin credential.
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createPartySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid party payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Auto-generate a hex token for the new party's admin_token column.
  const rawAdminToken = randomBytes(16).toString("hex");

  const [existing] = await db
    .select({ id: schema.parties.id })
    .from(schema.parties)
    .where(eq(schema.parties.slug, parsed.data.slug))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: `Party with slug '${parsed.data.slug}' already exists` },
      { status: 409 }
    );
  }

  // Check password uniqueness — password is the login key, must not collide.
  const [passwordConflict] = await db
    .select({ id: schema.parties.id })
    .from(schema.parties)
    .where(eq(schema.parties.password, parsed.data.password))
    .limit(1);
  if (passwordConflict) {
    return NextResponse.json(
      { error: "Password already in use by another party" },
      { status: 409 }
    );
  }

  try {
    const [party] = await db
      .insert(schema.parties)
      .values({ ...parsed.data, adminToken: rawAdminToken })
      .returning();
    return NextResponse.json(
      { party: { id: party.id, slug: party.slug, adminToken: party.adminToken } },
      { status: 201 }
    );
  } catch (err) {
    console.error("create party failed", err);
    return NextResponse.json({ error: "Failed to create party" }, { status: 500 });
  }
}
