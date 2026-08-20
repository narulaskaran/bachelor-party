import { constantTimeEqual, sessionCookieOptions, sha256hex } from "@/lib/cookie-hash";

export const EVENT_COOKIE = "bp_event";

export async function guestEventCookieValue(
  partyId: number,
  guestToken: string,
): Promise<string> {
  const token = await sha256hex(`bp-event-v1:${partyId}:${guestToken}`);
  return `${partyId}.${token}`;
}

export async function guestEventCookie(partyId: number, guestToken: string) {
  return {
    name: EVENT_COOKIE,
    value: await guestEventCookieValue(partyId, guestToken),
    ...sessionCookieOptions(),
  };
}

export async function cookieAuthenticatesGuestEvent(
  rawCookie: string | undefined,
  partyId: number,
  guestToken: string,
): Promise<boolean> {
  if (!rawCookie || !guestToken) return false;
  return constantTimeEqual(rawCookie, await guestEventCookieValue(partyId, guestToken));
}
