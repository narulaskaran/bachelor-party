import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { DEMO_PARTY } from "@/lib/demo-party";
import type { PartyContent } from "@/lib/party-types";

type Db = NonNullable<ReturnType<typeof getDb>>;

export type ResolvedSlugParty =
  | { status: "missing" }
  | { status: "open"; content: PartyContent }
  | {
      status: "gated";
      id: number | "demo";
      password: string;
      content: PartyContent;
    };

/**
 * Resolve a guest-facing `/:slug` trip.
 *
 * A database row always wins, so real trips (including a seeded `demo`)
 * keep their own content and password. If there is no row, slug `demo`
 * falls back to `DEMO_PARTY` so `/demo` works on a deployment that has
 * `DATABASE_URL` but no demo record — and without an organizer packet.
 *
 * No-DB local mode still honors `PARTY_PASSWORD` as a gate on that fixture.
 */
export async function resolvePartyBySlug(
  slug: string,
  db: Db | null = getDb(),
): Promise<ResolvedSlugParty> {
  if (db) {
    try {
      const [row] = await db
        .select({
          id: schema.parties.id,
          password: schema.parties.password,
          content: schema.parties.content,
        })
        .from(schema.parties)
        .where(eq(schema.parties.slug, slug))
        .limit(1);
      if (row) {
        return {
          status: "gated",
          id: row.id,
          password: row.password,
          content: row.content,
        };
      }
    } catch (err) {
      console.error("resolvePartyBySlug failed", err);
      if (slug !== "demo") throw err;
    }
  }

  if (slug !== "demo") return { status: "missing" };

  const expected = process.env.PARTY_PASSWORD;
  // PARTY_PASSWORD is the no-DB local gate. With a database configured
  // (the production-with-DB case), serve the sample trip openly.
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
