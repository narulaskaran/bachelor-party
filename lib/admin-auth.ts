import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Bearer-token gate for /api/admin/**. Meant for agents/scripts, not
// browsers — no cookie, no UI. Token lives in ADMIN_API_TOKEN or
// the party-scoped admin_token column. Supports two signatures:
//   requireAdmin(request)                           → global-only mode (superadmin)
//   requireAdmin(request, { partyToken })           → party-scoped mode
// In party-scoped mode the party token takes priority; if it matches the
// party’s admin_token column the caller is authorized as that party's admin.
// The global ADMIN_API_TOKEN always works as a superadmin override regardless
// of which overload was used — callers that have the global token never lose it.

export function requireAdmin(request: Request): NextResponse | null;
export function requireAdmin(
  request: Request,
  options: { partyToken?: string },
): NextResponse | null;
export function requireAdmin(
  request: Request,
  options?: { partyToken?: string },
): NextResponse | null {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Admin API is not configured (ADMIN_API_TOKEN unset)" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  // 1. Check the provided party-scoped token first.
  const partyToken = options?.partyToken;
  if (partyToken && timingSafeEqual(Buffer.from(token), Buffer.from(partyToken))) {
    return null; // exact match on party token
  }

  // 2. Fallback to global ADMIN_API_TOKEN.
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return null; // authorized (global or party-scoped)
}
