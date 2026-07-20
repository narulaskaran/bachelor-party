import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

// Cheap edge gate: no cookie → login. Real validation (party lookup,
// token check) happens server-side in getCurrentParty on every render.
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /login, /, and /api/admin gate themselves (admin uses its own bearer token).
  if (pathname === "/login" || pathname === "/" || pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  if (request.cookies.get(AUTH_COOKIE)?.value) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("from", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Everything except Next internals, static assets, and favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
