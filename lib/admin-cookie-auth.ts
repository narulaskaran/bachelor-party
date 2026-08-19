import { constantTimeEqual, sha256hex } from "@/lib/cookie-hash";

export const ADMIN_COOKIE = "bp_admin";

// Namespaced separately from guest (`bp-v2:`) and host (`bp-host-v1:`) so
// those cookies cannot unlock /admin. ADMIN_UI_PASSWORD must be set on
// deployment (no per-party secret).

export async function adminCookieValue(expectedPW: string): Promise<string> {
  return sha256hex(`admin-ui:${expectedPW}`);
}

export async function cookieAuthenticatesAdmin(
  rawCookie: string,
  expectedPW: string
): Promise<boolean> {
  return constantTimeEqual(rawCookie, await adminCookieValue(expectedPW));
}
