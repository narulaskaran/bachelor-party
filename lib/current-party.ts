import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { AUTH_COOKIE } from "@/lib/auth";
import { cookieAuthenticatesParty } from "@/lib/party-auth";
import { EVENT_COOKIE, cookieAuthenticatesGuestEvent } from "@/lib/guest-event-auth";
import { guestInvitePath } from "@/lib/guest-invite";
import { getDb, schema } from "@/lib/db";
import { DEMO_PARTY } from "@/lib/demo-party";
import type { PartyContent } from "@/lib/party-types";

export type CurrentParty = {
  partyId: number | "demo";
  slug: string;
  content: PartyContent;
  guestPath?: string;
};

// Resolves the logged-in party from the auth cookie.
// - With a database: cookie is "<id>.<token>", validated against the row.
//   Leftover `slug=demo` rows are ignored — guest `/demo` is the fixture.
// - Without one (local dev / fresh deploy): PARTY_PASSWORD env gates a
//   built-in demo party; with no password configured at all, demo is open.
export async function getCurrentParty(): Promise<CurrentParty | null> {
  const store = await cookies();
  const authRaw = store.get(AUTH_COOKIE)?.value;
  const eventRaw = store.get(EVENT_COOKIE)?.value;
  const db = getDb();

  if (!db) {
    const expected = process.env.PARTY_PASSWORD;
    if (!expected) return { partyId: "demo", slug: "demo", content: DEMO_PARTY };
    if (await cookieAuthenticatesParty(authRaw, "demo", expected)) {
      return { partyId: "demo", slug: "demo", content: DEMO_PARTY };
    }
    return null;
  }

  try {
    const fromAuth = await partyFromAccessCookie(db, authRaw);
    if (fromAuth) return fromAuth;
    return partyFromEventCookie(db, eventRaw);
  } catch (err) {
    console.error("getCurrentParty failed", err);
    return null;
  }
}

type Db = NonNullable<ReturnType<typeof getDb>>;

async function partyFromAccessCookie(db: Db, raw: string | undefined): Promise<CurrentParty | null> {
  const parsed = parsePartyCookie(raw);
  if (!parsed) return null;
  const [party] = await db
    .select()
    .from(schema.parties)
    .where(eq(schema.parties.id, parsed.id))
    .limit(1);
  if (!party || party.published === false || party.slug === "demo") return null;
  if (!(await cookieAuthenticatesParty(raw, party.id, party.password))) return null;
  return currentFromParty(party);
}

async function partyFromEventCookie(db: Db, raw: string | undefined): Promise<CurrentParty | null> {
  const parsed = parsePartyCookie(raw);
  if (!parsed) return null;
  const [party] = await db
    .select()
    .from(schema.parties)
    .where(eq(schema.parties.id, parsed.id))
    .limit(1);
  if (!party?.guestToken || party.published === false || party.slug === "demo") return null;
  if (!(await cookieAuthenticatesGuestEvent(raw, party.id, party.guestToken))) return null;
  return currentFromParty(party);
}

function parsePartyCookie(raw: string | undefined): { id: number } | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 1) return null;
  const id = Number(raw.slice(0, dot));
  if (!Number.isInteger(id) || id < 1) return null;
  return { id };
}

function currentFromParty(party: {
  id: number;
  slug: string;
  content: PartyContent;
  guestToken?: string | null;
}): CurrentParty {
  return {
    partyId: party.id,
    slug: party.slug,
    content: party.content,
    ...(party.guestToken ? { guestPath: guestInvitePath(party.guestToken) } : {}),
  };
}
