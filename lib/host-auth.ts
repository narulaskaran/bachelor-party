export const HOST_COOKIE = "bp_host";

// Cookie format matches guest auth: "<partyId>.<token>". The hash input is
// namespaced so a guest password cookie cannot unlock host tools.

async function sha256hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
  return rawCookie === (await hostCookieValue(partyId, adminToken));
}
