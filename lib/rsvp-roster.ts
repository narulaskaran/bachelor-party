import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  getCurrentParty,
  partyFromGuestInvite,
  type CurrentParty,
} from "@/lib/current-party";
import { guestInviteTokenFromPathname } from "@/lib/party-exists";
import { pathnameFromHeaders } from "@/lib/request-pathname";
import { guestVisibleRoster, type GuestVisibleRosterEntry } from "@/lib/roster-visibility";
import { findGuestByToken, rsvpIdentityToken } from "@/lib/rsvp-identity";
import type { RsvpPrefill } from "@/lib/merge-guest";

/**
 * Party for the public guest roster / RSVP prefill.
 * An explicit `/g/{token}` (argument or this request's path) never falls
 * back to leftover cookies from another trip.
 */
export async function partyForPublicRoster(
  inviteToken?: string,
): Promise<CurrentParty | null> {
  if (inviteToken?.trim()) {
    return partyFromGuestInvite(inviteToken);
  }
  const pathname = pathnameFromHeaders(await headers());
  const pathInvite = pathname ? guestInviteTokenFromPathname(pathname) : null;
  if (pathInvite) return partyFromGuestInvite(pathInvite);
  if (pathname?.startsWith("/g/")) return null;
  return getCurrentParty();
}

async function guestsForParty(current: CurrentParty): Promise<GuestVisibleRosterEntry[]> {
  const db = getDb();
  if (!db || current.partyId === "demo") return [];
  try {
    const guests = await db
      .select({
        id: schema.guests.id,
        name: schema.guests.name,
        attendanceStatus: schema.guests.attendanceStatus,
      })
      .from(schema.guests)
      .where(eq(schema.guests.partyId, current.partyId))
      .orderBy(schema.guests.name);
    return guestVisibleRoster(guests);
  } catch (err) {
    console.error("getGuests failed", err);
    return [];
  }
}

async function prefillForParty(current: CurrentParty): Promise<RsvpPrefill | null> {
  const db = getDb();
  if (!db || current.partyId === "demo") return null;

  const token = await rsvpIdentityToken(db, current.partyId, await cookies());
  if (!token) return null;

  try {
    const guest = await findGuestByToken(db, current.partyId, token);
    if (!guest) return null;
    return {
      name: guest.name,
      nameKey: guest.nameKey,
      attendanceStatus: guest.attendanceStatus,
      partySize: guest.partySize,
      plusOneName: guest.plusOneName,
      phone: guest.phone,
      arrivalFlight: guest.arrivalFlight,
      arrivalTime: guest.arrivalTime,
      departureFlight: guest.departureFlight,
      departureTime: guest.departureTime,
      dietary: guest.dietary,
      notes: guest.notes,
      activityPrefs: guest.activityPrefs,
      updatedAt: guest.updatedAt,
    };
  } catch (err) {
    console.error("getRsvpPrefill failed", err);
    return null;
  }
}

export async function getGuests(inviteToken?: string) {
  const current = await partyForPublicRoster(inviteToken);
  if (!current) return [];
  return guestsForParty(current);
}

/** The guest this browser last saved on THIS event, if they're on the roster. */
export async function getRsvpPrefill(inviteToken?: string): Promise<RsvpPrefill | null> {
  const current = await partyForPublicRoster(inviteToken);
  if (!current) return null;
  return prefillForParty(current);
}

/**
 * One party-by-token resolve, then roster + prefill in parallel.
 * `getGuests` / `getRsvpPrefill` still work; this is the /g/{token} path.
 */
export async function loadPublicRsvp(inviteToken?: string): Promise<{
  guests: GuestVisibleRosterEntry[];
  prefill: RsvpPrefill | null;
}> {
  const current = await partyForPublicRoster(inviteToken);
  if (!current) return { guests: [], prefill: null };
  const [guests, prefill] = await Promise.all([
    guestsForParty(current),
    prefillForParty(current),
  ]);
  return { guests, prefill };
}
