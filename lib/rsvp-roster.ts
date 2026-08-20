import { cookies, headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  getCurrentParty,
  partyFromGuestInvite,
  type CurrentParty,
} from "@/lib/current-party";
import { guestInviteTokenFromPathname } from "@/lib/party-exists";
import { pathnameFromHeaders } from "@/lib/request-pathname";
import { guestVisibleRoster } from "@/lib/roster-visibility";
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

export async function getGuests(inviteToken?: string) {
  const current = await partyForPublicRoster(inviteToken);
  const db = getDb();
  if (!current || !db || current.partyId === "demo") return [];
  try {
    const guests = await db
      .select({
        id: schema.guests.id,
        name: schema.guests.name,
        attendanceStatus: schema.guests.attendanceStatus,
      })
      .from(schema.guests)
      .where(and(eq(schema.guests.partyId, current.partyId)))
      .orderBy(schema.guests.name);
    return guestVisibleRoster(guests);
  } catch (err) {
    console.error("getGuests failed", err);
    return [];
  }
}

/** The guest this browser last saved on THIS event, if they're on the roster. */
export async function getRsvpPrefill(inviteToken?: string): Promise<RsvpPrefill | null> {
  const current = await partyForPublicRoster(inviteToken);
  const db = getDb();
  if (!current || !db || current.partyId === "demo") return null;

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
