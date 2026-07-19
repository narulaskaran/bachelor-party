import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Bearer-token gate for /api/admin/**. Meant for agents/scripts, not
// browsers — no cookie, no UI. Token lives in ADMIN_API_TOKEN or
// the party-scoped admin_token column. Supports two signatures:
//   requireAdmin(request)                           → global-only mode (superadmin)
//   requireAdmin(request, { partyToken })           → party-scoped mode
// In party-scoped mode the party token takes priority; if it matches the
// party's admin_token column the caller is authorized as that party's admin.
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
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const requestBuf = Buffer.from(token);

  // 1. Per-party token (if supplied and non-empty) — checked first so party
  //    admins work even when ADMIN_API_TOKEN is not set on this deployment.
  const partyToken = options?.partyToken;
  if (partyToken && partyToken.length > 0) {
    const partyBuf = Buffer.from(partyToken);
    if (requestBuf.length === partyBuf.length && timingSafeEqual(requestBuf, partyBuf)) {
      return null; // authorized as this party's admin
    }
  }

  // 2. Fallback → global superadmin token
  const globalExpected = process.env.ADMIN_API_TOKEN;
  if (!globalExpected) {
    return NextResponse.json(
      { error: "Admin API is not configured (ADMIN_API_TOKEN unset)" },
      { status: 503 },
    );
  }

  const globalBuf = Buffer.from(globalExpected);
  if (requestBuf.length !== globalBuf.length || !timingSafeEqual(requestBuf, globalBuf)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return null; // authorized as superadmin
}
