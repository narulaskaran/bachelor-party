import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.next();
  }

  const password = process.env.PARTY_PASSWORD;
  if (!password) {
    // No password configured — fail open in dev, but make it obvious.
    console.warn("PARTY_PASSWORD is not set; site is unprotected");
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await hashPassword(password))) {
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
