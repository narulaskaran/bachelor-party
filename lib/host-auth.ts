import { constantTimeEqual, sha256hex } from "@/lib/cookie-hash";

export const HOST_COOKIE = "bp_host";

// Cookie format matches guest auth: "<partyId>.<token>". The hash input is
// namespaced so a guest password cookie cannot unlock host tools.

export async function hostCookieValue(partyId: number, adminToken: string): Promise<string> {
  const token = await sha256hex(`bp-host-v1:${partyId}:${adminToken}`);
  return `${partyId}.${token}`;
}

export async function cookieAuthenticatesHost(
  rawCookie: string | undefined,
  partyId: number,
  adminToken: string,
): Promise<boolean> {
  if (!rawCookie || !adminToken) return false;
  return constantTimeEqual(rawCookie, await hostCookieValue(partyId, adminToken));
}
