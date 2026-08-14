import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { issuesFromZod } from "@/lib/api-errors";
import { getDb, schema } from "@/lib/db";
import { organizerPacket } from "@/lib/organizer-packet";
import { createPartySchema } from "@/lib/party-schema";
import { slugFromName, uniqueSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

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
      dateLabel: row.content.trip.dateLabel,
      guestCount: row.guestCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  });
}

// POST /api/admin/parties — create. siteName is enough; slug and password
// autogenerate. Returns an organizer packet (url, slug, password, adminToken).
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
      { error: "Invalid party payload", issues: issuesFromZod(parsed.error) },
      { status: 400 },
    );
  }

  const content = {
    ...parsed.data.content,
    kind: "trip" as const,
  };

  const taken = async (candidate: string) => {
    const [row] = await db
      .select({ id: schema.parties.id })
      .from(schema.parties)
      .where(eq(schema.parties.slug, candidate))
      .limit(1);
    return Boolean(row);
  };

  let slug = parsed.data.slug;
  if (slug) {
    if (await taken(slug)) {
      return NextResponse.json(
        {
          error: `Trip with slug '${slug}' already exists`,
          issues: [
            {
              path: "slug",
              message: "already exists",
              hint: "GET the trip and PATCH it, or pick a different slug.",
            },
          ],
        },
        { status: 409 },
      );
    }
  } else {
    slug = await uniqueSlug(slugFromName(content.trip.siteName), taken);
  }

  let password = parsed.data.password ?? randomBytes(6).toString("hex");
  const passwordTaken = async (value: string) => {
    const [row] = await db
      .select({ id: schema.parties.id })
      .from(schema.parties)
      .where(eq(schema.parties.password, value))
      .limit(1);
    return Boolean(row);
  };
  if (await passwordTaken(password)) {
    if (parsed.data.password) {
      return NextResponse.json(
        { error: "Password already in use by another trip" },
        { status: 409 },
      );
    }
    do {
      password = randomBytes(6).toString("hex");
    } while (await passwordTaken(password));
  }

  const rawAdminToken = randomBytes(16).toString("hex");

  try {
    const [party] = await db
      .insert(schema.parties)
      .values({ slug, password, content, adminToken: rawAdminToken })
      .returning();
    return NextResponse.json(
      {
        party: { id: party.id, slug: party.slug, adminToken: party.adminToken },
        ...organizerPacket(request, {
          slug: party.slug,
          password: party.password,
          adminToken: party.adminToken,
        }),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("create party failed", err);
    return NextResponse.json({ error: "Failed to create party" }, { status: 500 });
  }
}
