import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Bearer-token gate for /api/admin/**. Meant for agents/scripts, not
// browsers — no cookie, no UI. Token lives in ADMIN_API_TOKEN.
export function requireAdmin(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Admin API is not configured (ADMIN_API_TOKEN unset)" },
      { status: 503 }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return null; // authorized
}
