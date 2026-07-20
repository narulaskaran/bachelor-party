import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { AUTH_COOKIE } from "@/lib/auth";
import { cookieAuthenticatesParty } from "@/lib/party-auth";
import { getDb, schema } from "@/lib/db";
import { DEMO_PARTY } from "@/lib/demo-party";
import type { PartyContent } from "@/lib/party-types";

export type CurrentParty = {
  partyId: number | "demo";
  content: PartyContent;
};

// Resolves the logged-in party from the auth cookie.
// - With a database: cookie is "<id>.<token>", validated against the row.
// - Without one (local dev / fresh deploy): PARTY_PASSWORD env gates a
//   built-in demo party; with no password configured at all, demo is open.
export async function getCurrentParty(): Promise<CurrentParty | null> {
  const raw = (await cookies()).get(AUTH_COOKIE)?.value;
  const db = getDb();

  if (!db) {
    const expected = process.env.PARTY_PASSWORD;
    if (!expected) return { partyId: "demo", content: DEMO_PARTY };
    if (await cookieAuthenticatesParty(raw, "demo", expected)) {
      return { partyId: "demo", content: DEMO_PARTY };
    }
    return null;
  }

  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 1) return null;
  const id = Number(raw.slice(0, dot));
  if (!Number.isInteger(id) || id < 1) return null;

  try {
    const [party] = await db
      .select()
      .from(schema.parties)
      .where(eq(schema.parties.id, id))
      .limit(1);
    if (!party) return null;
    if (!(await cookieAuthenticatesParty(raw, party.id, party.password))) return null;
    return { partyId: party.id, content: party.content };
  } catch (err) {
    console.error("getCurrentParty failed", err);
    return null;
  }
}
