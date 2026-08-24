import { constantTimeEqual, sessionCookieOptions, sha256hex } from "@/lib/cookie-hash";

export const HOST_COOKIE = "bp_host";

export const WRONG_HOST_KEY =
  "Wrong host key. It's the key shown when you created this event — not a guest link.";

export function isWrongHostKeyError(error?: string | null): boolean {
  return Boolean(error && /wrong host key/i.test(error));
}

// Cookie format matches guest auth: "<partyId>.<token>". The hash input is
// namespaced so a guest password cookie cannot unlock host tools.

export async function hostCookieValue(partyId: number, adminToken: string): Promise<string> {
  const token = await sha256hex(`bp-host-v1:${partyId}:${adminToken}`);
  return `${partyId}.${token}`;
}

/** Name, hashed value, and options for create-set and host-unlock cookies. */
export async function hostSessionCookie(partyId: number, adminToken: string) {
  return {
    name: HOST_COOKIE,
    value: await hostCookieValue(partyId, adminToken),
    ...sessionCookieOptions(),
  };
}

export async function cookieAuthenticatesHost(
  rawCookie: string | undefined,
  partyId: number,
  adminToken: string,
): Promise<boolean> {
  if (!rawCookie || !adminToken) return false;
  return constantTimeEqual(rawCookie, await hostCookieValue(partyId, adminToken));
}

/** Read the host session cookie off an incoming Request (API routes). */
export function hostCookieFromRequest(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() !== HOST_COOKIE) continue;
    const value = trimmed.slice(eq + 1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}
