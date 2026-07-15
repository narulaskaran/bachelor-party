import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Bearer-token gate for /api/admin/**. Meant for agents/scripts, not
// browsers — no cookie, no UI.
// If *partyToken* is provided, it is checked first (per-party token). The global
// ADMIN_API_TOKEN always remains a superadmin override.

export function requireAdmin(
  request: Request,
  partyToken: string | null = null,
): NextResponse | null {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const a = Buffer.from(token);

  // Per-party token (if supplied and non-empty)
  if (partyToken && partyToken.length > 0) {
    const b = Buffer.from(partyToken);
    const valid = a.length === b.length && timingSafeEqual(a, b);
    if (valid) {
      return null; // authorized as this party's admin
    }
  }

  // Fallback → global superadmin token
  const globalExpected = process.env.ADMIN_API_TOKEN;
  if (!globalExpected) {
    return NextResponse.json(
      { error: "Admin API is not configured (ADMIN_API_TOKEN unset)" },
      { status: 503 },
    );
  }

  const bGlobal = Buffer.from(globalExpected);
  const valid = a.length === bGlobal.length && timingSafeEqual(a, bGlobal);
  if (!valid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return null; // authorized as superadmin
}
