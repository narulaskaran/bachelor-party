import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "@/lib/db";
import {
  RSVP_COOKIE,
  readGuestToken,
  readScopedRsvpToken,
} from "@/lib/merge-guest";

type Db = NonNullable<ReturnType<typeof getDb>>;

export async function findGuestByToken(db: Db, partyId: number, token: string) {
  const [guest] = await db
    .select()
    .from(schema.guests)
    .where(
      and(
        eq(schema.guests.partyId, partyId),
        eq(schema.guests.guestToken, token),
      ),
    )
    .limit(1);
  return guest;
}

/** Identity saved for this party only. Leftover global cookies from other trips are ignored. */
export async function rsvpIdentityToken(
  db: Db,
  partyId: number,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<string | null> {
  const scoped = readScopedRsvpToken(cookieStore, partyId);
  if (scoped) return scoped;
  const legacy = readGuestToken(cookieStore.get(RSVP_COOKIE)?.value);
  if (!legacy) return null;
  const belongsHere = await findGuestByToken(db, partyId, legacy);
  return belongsHere ? legacy : null;
}
