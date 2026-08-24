import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { readBearerToken, requireAdmin } from "@/lib/admin-auth";
import { adminPartyView } from "@/lib/admin-party-view";
import { credentialFingerprint } from "@/lib/content-versions";
import { getDb, schema } from "@/lib/db";
import { cookieAuthenticatesHost, hostCookieFromRequest } from "@/lib/host-auth";
import { persistPublishedParty, preparePublish } from "@/lib/publish-party";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

function withRecord<T extends Record<string, unknown>>(party: T) {
  return { trip: party, party };
}

// POST /api/admin/trips/:slug/publish — explicit host publish. Never implied
// by create or PATCH. Accepts the trip adminToken (host key) or the host
// session cookie.
export async function POST(request: Request, ctx: Params) {
  const { slug }: { slug: string } = await ctx.params;
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let party: typeof schema.parties.$inferSelect | undefined;
  try {
    [party] = await db
      .select()
      .from(schema.parties)
      .where(eq(schema.parties.slug, slug))
      .limit(1);
  } catch (err) {
    console.error("publish trip lookup failed", err);
    return NextResponse.json({ error: "Failed to publish trip" }, { status: 500 });
  }

  const token = readBearerToken(request);
  let actorType: "host" | "admin" = "admin";
  if (token) {
    const denied = requireAdmin(request, { partyToken: party?.adminToken ?? undefined });
    if (denied) return denied;
    if (!party) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  } else if (!party) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  } else {
    const hostCookie = hostCookieFromRequest(request);
    if (!(await cookieAuthenticatesHost(hostCookie, party.id, party.adminToken ?? ""))) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }
    actorType = "host";
  }

  const prepared = preparePublish(party);
  if (!prepared.ok) {
    return NextResponse.json({ error: prepared.error }, { status: 409 });
  }

  try {
    const guestUrl = await persistPublishedParty(db, party, prepared, {
      actorType,
      actorId: token ? credentialFingerprint(token) : undefined,
    });
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/host`);
    const view = adminPartyView({
      ...party,
      content: prepared.publishedContent,
      draftContent: prepared.reviewedDraft,
      published: true,
    });
    return NextResponse.json({
      ...withRecord(view),
      guestUrl,
      published: true,
    });
  } catch (err) {
    console.error("publish trip failed", err);
    return NextResponse.json({ error: "Failed to publish trip" }, { status: 500 });
  }
}
