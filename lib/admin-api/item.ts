import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { issuesFromZod, readJsonBody } from "@/lib/api-errors";
import { authorizePartyBySlug } from "@/lib/authorize-party";
import { schema } from "@/lib/db";
import { mergePatch } from "@/lib/merge-patch";
import { parsePartyContentForExisting, updatePartySchema } from "@/lib/party-schema";
import type { PartyContent } from "@/lib/party-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

function withRecord<T extends Record<string, unknown>>(party: T) {
  return { trip: party, party };
}

// GET /api/admin/trips/:slug — full record, including password and content.
export async function GET(request: Request, ctx: Params) {
  const { slug }: { slug: string } = await ctx.params;
  // authorizePartyBySlug queries the DB unguarded; wrap so clients get the
  // JSON envelope, never an HTML 500 (same contract as collection.ts).
  let auth: Awaited<ReturnType<typeof authorizePartyBySlug>>;
  try {
    auth = await authorizePartyBySlug(request, slug);
  } catch (err) {
    console.error("get trip failed", err);
    return NextResponse.json({ error: "Failed to get trip" }, { status: 500 });
  }
  if (!auth.ok) return auth.error;
  return NextResponse.json(withRecord(auth.party));
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug }: { slug: string } = await params;
  let auth: Awaited<ReturnType<typeof authorizePartyBySlug>>;
  try {
    auth = await authorizePartyBySlug(request, slug);
  } catch (err) {
    console.error("update trip failed", err);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
  if (!auth.ok) return auth.error;
  const { db, party } = auth;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = updatePartySchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update payload", issues: issuesFromZod(parsed.error) },
      { status: 400 },
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  let nextContent: PartyContent | undefined;
  if (parsed.data.content) {
    const baseContent = party.draftContent ?? party.content;
    const merged = mergePatch(baseContent, parsed.data.content);
    const contentParsed = parsePartyContentForExisting(merged, baseContent);
    if (!contentParsed.success) {
      return NextResponse.json(
        { error: "Invalid merged content", issues: issuesFromZod(contentParsed.error) },
        { status: 400 },
      );
    }
    nextContent = { ...contentParsed.data, kind: "trip" };
  }

  if (parsed.data.password) {
    // Conflict check races with concurrent PATCHes; the full lost-update fix
    // is out of scope — here we only guarantee the JSON error envelope when
    // this lookup itself fails, matching collection.ts's try/catch pattern.
    let conflict: { slug: string } | undefined;
    try {
      [conflict] = await db
        .select({ slug: schema.parties.slug })
        .from(schema.parties)
        .where(eq(schema.parties.password, parsed.data.password))
        .limit(1);
    } catch (err) {
      console.error("trip password conflict check failed", err);
      return NextResponse.json(
        { error: "Failed to update trip" },
        { status: 500 },
      );
    }
    if (conflict && conflict.slug !== slug) {
      return NextResponse.json(
        { error: "Password already in use by another trip" },
        { status: 409 },
      );
    }
  }

  try {
    const [updated] = await db
      .update(schema.parties)
      .set({
        ...(parsed.data.password ? { password: parsed.data.password } : {}),
        ...(nextContent ? { content: nextContent, draftContent: nextContent } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.parties.slug, slug))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    return NextResponse.json(withRecord(updated));
  } catch (err) {
    console.error("update trip failed", err);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: Params) {
  const { slug }: { slug: string } = await ctx.params;
  let auth: Awaited<ReturnType<typeof authorizePartyBySlug>>;
  try {
    auth = await authorizePartyBySlug(request, slug);
  } catch (err) {
    console.error("delete trip failed", err);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
  if (!auth.ok) return auth.error;
  const { db, party } = auth;

  try {
    await db.delete(schema.guests).where(eq(schema.guests.partyId, party.id));
    await db.delete(schema.parties).where(eq(schema.parties.id, party.id));
    return NextResponse.json({ deleted: slug });
  } catch (err) {
    console.error("delete trip failed", err);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}
