import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { DEMO_PARTY } from "@/lib/demo-party";
import type { PartyContent } from "@/lib/party-types";

type Db = NonNullable<ReturnType<typeof getDb>>;

export type ResolvedSlugParty =
  | { status: "missing" }
  | { status: "open"; content: PartyContent }
  | { status: "unpublished" }
  | {
      status: "gated";
      id: number | "demo";
      password: string;
      content: PartyContent;
      guestToken?: string | null;
    };

export type ResolvedGuestTokenParty =
  | { status: "missing" }
  | { status: "unpublished" }
  | {
      status: "published";
      id: number;
      slug: string;
      guestToken: string;
      content: PartyContent;
    };

/** Proxy-only: existence / cookie mint. No content jsonb. */
export type GuestInviteMeta =
  | { status: "missing" }
  | { status: "unpublished" }
  | { status: "published"; id: number; guestToken: string };

/**
 * Resolve a guest-facing `/:slug` trip.
 *
 * Slug `demo` always serves `DEMO_PARTY`, even if a leftover `parties` row
 * with `slug=demo` exists (reserved since #79; new creates cannot make that
 * row). With a database configured, the fixture stays open — no organizer
 * packet and no `PARTY_PASSWORD`. No-DB local mode still honors
 * `PARTY_PASSWORD` as a gate on that fixture.
 *
 * Any other slug looks up the database row (gated by that trip's password)
 * or 404s.
 */
export async function resolvePartyBySlug(
  slug: string,
  db: Db | null = getDb(),
): Promise<ResolvedSlugParty> {
  if (slug === "demo") {
    const expected = process.env.PARTY_PASSWORD;
    // PARTY_PASSWORD is the no-DB local gate. With a database configured
    // (the production-with-DB case), serve the sample trip openly — leftover
    // `demo` rows must not hide or password-gate the public fixture.
    if (!db && expected) {
      return {
        status: "gated",
        id: "demo",
        password: expected,
        content: DEMO_PARTY,
      };
    }
    return { status: "open", content: DEMO_PARTY };
  }

  if (db) {
    try {
      const [row] = await db
        .select({
          id: schema.parties.id,
          password: schema.parties.password,
          content: schema.parties.content,
          published: schema.parties.published,
          guestToken: schema.parties.guestToken,
        })
        .from(schema.parties)
        .where(eq(schema.parties.slug, slug))
        .limit(1);
      if (row) {
        if (row.published === false) return { status: "unpublished" };
        return {
          status: "gated",
          id: row.id,
          password: row.password,
          content: row.content,
          ...(row.guestToken ? { guestToken: row.guestToken } : {}),
        };
      }
    } catch (err) {
      console.error("resolvePartyBySlug failed", err);
      throw err;
    }
  }

  return { status: "missing" };
}

/**
 * Bump so tests do not share React `cache()` results across cases.
 * Production RSC requests never call this; each request has its own cache.
 */
let guestTokenCacheEpoch = 0;

export function resetPartyLookups() {
  guestTokenCacheEpoch += 1;
}

async function lookupPartyByGuestToken(
  token: string,
  db: Db | null,
): Promise<ResolvedGuestTokenParty> {
  if (!db || !token) return { status: "missing" };
  try {
    const [row] = await db
      .select({
        id: schema.parties.id,
        slug: schema.parties.slug,
        guestToken: schema.parties.guestToken,
        content: schema.parties.content,
        published: schema.parties.published,
      })
      .from(schema.parties)
      .where(eq(schema.parties.guestToken, token))
      .limit(1);
    if (!row?.guestToken) return { status: "missing" };
    if (row.published === false) return { status: "unpublished" };
    return {
      status: "published",
      id: row.id,
      slug: row.slug,
      guestToken: row.guestToken,
      content: row.content,
    };
  } catch (err) {
    console.error("resolvePartyByGuestToken failed", err);
    throw err;
  }
}

const loadGuestPartyCached = cache(async (token: string, epoch: number) => {
  void epoch;
  return lookupPartyByGuestToken(token, getDb());
});

/**
 * Resolve a guest invite token (`/g/:token`). Never returns draft content.
 *
 * One-arg calls (layout, page, RSVP) share one lookup per RSC request via
 * React `cache()`. Passing `db` skips that cache (tests / explicit client).
 *
 * Proxy is a separate invocation, so it uses `lookupGuestInviteMeta` (no
 * content jsonb) instead of this full read.
 */
export async function resolvePartyByGuestToken(
  token: string,
  db?: Db | null,
): Promise<ResolvedGuestTokenParty> {
  if (arguments.length >= 2) {
    return lookupPartyByGuestToken(token, db ?? null);
  }
  return loadGuestPartyCached(token, guestTokenCacheEpoch);
}

/**
 * Proxy `/g/{token}`: 404 vs cookie mint without loading published jsonb.
 * Unpublished and missing stay indistinguishable from today's full resolve.
 */
export async function lookupGuestInviteMeta(
  token: string,
  db: Db | null = getDb(),
): Promise<GuestInviteMeta> {
  if (!db || !token) return { status: "missing" };
  try {
    const [row] = await db
      .select({
        id: schema.parties.id,
        guestToken: schema.parties.guestToken,
        published: schema.parties.published,
      })
      .from(schema.parties)
      .where(eq(schema.parties.guestToken, token))
      .limit(1);
    if (!row?.guestToken) return { status: "missing" };
    if (row.published === false) return { status: "unpublished" };
    return { status: "published", id: row.id, guestToken: row.guestToken };
  } catch (err) {
    console.error("lookupGuestInviteMeta failed", err);
    throw err;
  }
}
