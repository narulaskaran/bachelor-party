import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authorizePartyBySlug } from "@/lib/authorize-party";
import { schema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// GET /api/admin/trips/:slug/versions — immutable content_versions audit
// trail, newest first. Admin-token scoped to the one trip, like every other
// /:slug route. Read-only by design: there is no update or delete path here,
// matching the append-only table (and its database triggers).
export async function GET(request: Request, ctx: Params) {
  const { slug }: { slug: string } = await ctx.params;
  let auth: Awaited<ReturnType<typeof authorizePartyBySlug>>;
  try {
    auth = await authorizePartyBySlug(request, slug);
  } catch (err) {
    console.error("list versions failed", err);
    return NextResponse.json({ error: "Failed to list versions" }, { status: 500 });
  }
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;

  let rows;
  try {
    const all = await auth.db
      .select()
      .from(schema.contentVersions)
      .where(eq(schema.contentVersions.partyId, auth.party.id));
    // Newest first, newest-N window applied here so ordering never depends on
    // driver behavior.
    rows = all.sort((a, b) => b.version - a.version).slice(0, limit);
  } catch (err) {
    console.error("list versions query failed", err);
    return NextResponse.json({ error: "Failed to list versions" }, { status: 500 });
  }

  const versions = rows
    .map((row) => ({
      id: row.id,
      version: row.version,
      state: row.state,
      contentSnapshot: row.contentSnapshot,
      baseVersion: row.baseVersion,
      actorType: row.actorType,
      actorId: row.actorId,
      changeSummary: row.changeSummary,
      createdAt: row.createdAt,
      publishedAt: row.publishedAt,
    }));

  return NextResponse.json({ trip: { slug }, party: { slug }, versions });
}
