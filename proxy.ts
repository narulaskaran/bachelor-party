import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyAdminHtmlSecurityHeaders,
  isAdminHtmlPath,
} from "@/lib/admin-security-headers";
import {
  guestSlugFromPathname,
  MISSING_GUEST_REWRITE,
  partyExists,
} from "@/lib/party-exists";

/**
 * Admin HTML: request-time copy of clickjacking / nosniff / CSP headers.
 * Auth still self-gates in app/admin/** — this is not an auth gate.
 *
 * Guest slugs: `notFound()` from a matching `/[slug]` page 404s with Next's
 * `__next_error__` HTML shell (content only hydrates on the client). Rewriting
 * missing slugs to `/_not-found` served that compiled route as HTTP 200.
 * Rewriting to an unmatched path uses App Router's unmatched-route 404, which
 * SSRs `app/not-found.tsx` inside the root layout and keeps HTTP 404.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminHtmlPath(pathname)) {
    const response = NextResponse.next();
    applyAdminHtmlSecurityHeaders(response.headers);
    return response;
  }

  const slug = guestSlugFromPathname(pathname);
  if (!slug || (await partyExists(slug))) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = MISSING_GUEST_REWRITE;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/((?!api|_next|_not-found|favicon.ico|icon.svg|admin).*)",
  ],
};
