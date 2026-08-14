import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { issuesFromZod, readJsonBody } from "@/lib/api-errors";
import { authorizePartyBySlug } from "@/lib/authorize-party";
import { schema } from "@/lib/db";
import { mergePatch } from "@/lib/merge-patch";
import { partyContentSchema, updatePartySchema } from "@/lib/party-schema";
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
  const auth = await authorizePartyBySlug(request, slug);
  if (!auth.ok) return auth.error;
  return NextResponse.json(withRecord(auth.party));
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug }: { slug: string } = await params;
  const auth = await authorizePartyBySlug(request, slug);
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
    const merged = mergePatch(party.content, parsed.data.content);
    const contentParsed = partyContentSchema.safeParse(merged);
    if (!contentParsed.success) {
      return NextResponse.json(
        { error: "Invalid merged content", issues: issuesFromZod(contentParsed.error) },
        { status: 400 },
      );
    }
    nextContent = { ...contentParsed.data, kind: "trip" };
  }

  if (parsed.data.password) {
    const [conflict] = await db
      .select({ slug: schema.parties.slug })
      .from(schema.parties)
      .where(eq(schema.parties.password, parsed.data.password))
      .limit(1);
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
        ...(nextContent ? { content: nextContent } : {}),
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
  const auth = await authorizePartyBySlug(request, slug);
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
