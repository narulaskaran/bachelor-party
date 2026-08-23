import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { readBearerToken } from "@/lib/admin-auth";
import { issuesFromZod, readJsonBody } from "@/lib/api-errors";
import { recordContentVersion } from "@/lib/content-versions";
import { getDb, schema } from "@/lib/db";
import { hostSessionCookie } from "@/lib/host-auth";
import { organizerPacket } from "@/lib/organizer-packet";
import { createPartySchema } from "@/lib/party-schema";
import { rateLimitCreate } from "@/lib/rate-limit";
import { slugFromName, uniqueSlug } from "@/lib/slug";
import { unguessableGuestToken } from "@/lib/guest-invite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function indexItem(
  party: {
    id: number;
    slug: string;
    content: { trip?: { siteName?: string; dateLabel?: string } } | null;
    createdAt: Date;
    updatedAt: Date;
  },
  guestCount: number,
) {
  return {
    id: party.id,
    slug: party.slug,
    siteName: party.content?.trip?.siteName,
    dateLabel: party.content?.trip?.dateLabel,
    guestCount,
    createdAt: party.createdAt,
    updatedAt: party.updatedAt,
  };
}

// GET /api/admin/trips — the trip whose adminToken was presented.
// Never lists other people's trips. /api/admin/parties rewrites here.
export async function GET(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let party: typeof schema.parties.$inferSelect | undefined;
  try {
    [party] = await db
      .select()
      .from(schema.parties)
      .where(eq(schema.parties.adminToken, token))
      .limit(1);
  } catch (err) {
    console.error("list trips failed", err);
    return NextResponse.json({ error: "Failed to list trips" }, { status: 500 });
  }

  if (!party) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let guests;
  try {
    guests = await db
      .select({ id: schema.guests.id })
      .from(schema.guests)
      .where(eq(schema.guests.partyId, party.id));
  } catch (err) {
    console.error("list trips guest count failed", err);
    return NextResponse.json({ error: "Failed to list trips" }, { status: 500 });
  }

  const trips = [indexItem(party, guests.length)];
  return NextResponse.json({ trips, parties: trips });
}

// POST /api/admin/trips — create, no Authorization. siteName is enough;
// slug and password autogenerate. Rate-limited per IP. Returns an
// organizer packet (url, slug, password, adminToken).
export async function POST(request: Request) {
  const limited = rateLimitCreate(request);
  if (limited) return limited;

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = createPartySchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid trip payload", issues: issuesFromZod(parsed.error) },
      { status: 400 },
    );
  }

  const content = {
    ...parsed.data.content,
    kind: "trip" as const,
    presentation: parsed.data.content.presentation ?? { style: "clean" as const },
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
  let guestToken = unguessableGuestToken();
  const guestTokenTaken = async (value: string) => {
    const [row] = await db
      .select({ id: schema.parties.id })
      .from(schema.parties)
      .where(eq(schema.parties.guestToken, value))
      .limit(1);
    return Boolean(row);
  };
  while (await guestTokenTaken(guestToken)) {
    guestToken = unguessableGuestToken();
  }

  try {
    const [party] = await db
      .insert(schema.parties)
      .values({
        slug,
        password,
        content,
        draftContent: content,
        published: false,
        adminToken: rawAdminToken,
        guestToken,
      })
      .returning();
    await recordContentVersion(db, {
      partyId: party.id,
      state: "draft",
      content,
      actorType: "host",
      changeSummary: "trip created",
    });
    const response = NextResponse.json(
      {
        trip: { id: party.id, slug: party.slug, adminToken: party.adminToken },
        party: { id: party.id, slug: party.slug, adminToken: party.adminToken },
        ...organizerPacket(request, {
          slug: party.slug,
          password: party.password,
          adminToken: party.adminToken,
        }),
      },
      { status: 201 },
    );
    // Same cookie unlockHostTrip sets, so /host Save and reload keep working
    // after create without pasting the host key.
    const { name, value, ...options } = await hostSessionCookie(party.id, rawAdminToken);
    response.cookies.set(name, value, options);
    return response;
  } catch (err) {
    console.error("create trip failed", err);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
