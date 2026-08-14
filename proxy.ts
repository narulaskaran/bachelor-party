import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyAdminHtmlSecurityHeaders,
  isAdminHtmlPath,
} from "@/lib/admin-security-headers";

// Request-time copy of the admin HTML security headers (clickjacking / nosniff /
// CSP). Auth still self-gates in app/admin/** — this file is not an auth gate.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (isAdminHtmlPath(request.nextUrl.pathname)) {
    applyAdminHtmlSecurityHeaders(response.headers);
  }
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
