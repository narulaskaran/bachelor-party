// Admin cookie auth - mirrors lib/auth.ts SHA-256 pattern so the two
// don't collide. ADMIN_UI_PASSWORD must be set on deployment to use
// the admin UI (no per-party secret needed).

export const ADMIN_COOKIE = "bp_admin";

async function sha256hex(input: string): Promise<string> {
  const buf = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  );
  return Array.from(buf)
    .map((b: number) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function adminCookieValue(expectedPW: string): Promise<string> {
  return sha256hex(`admin-ui:${expectedPW}`);
}

export async function cookieAuthenticatesAdmin(
  rawCookie: string,
  expectedPW: string
): Promise<boolean> {
  const expected = await adminCookieValue(expectedPW);
  // Constant-time comparison to prevent timing attacks
  return constantTimeEqual(rawCookie, expected);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
