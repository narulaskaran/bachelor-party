import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Bearer-token gate for /api/admin/** slug routes. The only credential is
// the trip-scoped adminToken from the 201 organizer packet. There is no
// deploy-wide superadmin secret — ADMIN_API_TOKEN is unused.

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(header);
  return match?.[1] ?? null;
}

export function requireAdmin(
  request: Request,
  options: { partyToken?: string | null },
): NextResponse | null {
  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const partyToken = options.partyToken;
  if (partyToken && partyToken.length > 0) {
    const requestBuf = Buffer.from(token);
    const partyBuf = Buffer.from(partyToken);
    if (requestBuf.length === partyBuf.length && timingSafeEqual(requestBuf, partyBuf)) {
      return null;
    }
  }

  return NextResponse.json({ error: "Invalid token" }, { status: 401 });
}
