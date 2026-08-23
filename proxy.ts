import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiNotFound } from "@/lib/api-not-found";
import {
  applyAdminHtmlSecurityHeaders,
  isAdminHtmlPath,
} from "@/lib/admin-security-headers";
import { canonicalRedirectLocation } from "@/lib/invite-host";
import { sessionCookieOptions } from "@/lib/cookie-hash";
import { guestEventCookie } from "@/lib/guest-event-auth";
import { HOST_COOKIE } from "@/lib/host-auth";
import {
  guestInviteTokenFromPathname,
  guestSlugFromPathname,
  MISSING_GUEST_REWRITE,
  partyExists,
  TRIP_UNAVAILABLE_REWRITE,
} from "@/lib/party-exists";
import { resolvePartyByGuestToken } from "@/lib/resolve-party";
import { REQUEST_PATHNAME_HEADER } from "@/lib/request-pathname";

function nextWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATHNAME_HEADER, request.nextUrl.pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const hostSession = request.cookies.get(HOST_COOKIE)?.value;
  if (hostSession) {
    // Refresh the opaque session while the host navigates away. Host access
    // still validates this value against the requested trip before unlocking.
    response.cookies.set(HOST_COOKIE, hostSession, sessionCookieOptions());
  }
  return response;
}

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
  const canonical = canonicalRedirectLocation(request);
  if (canonical) return NextResponse.redirect(canonical, 308);

  const { pathname } = request.nextUrl;

  // Exact `/api` and `/api/` — JSON 404, not Next's trailing-slash 308.
  if (pathname === "/api" || pathname === "/api/") {
    return apiNotFound();
  }

  // skipTrailingSlashRedirect: restore default strip-slash 308 elsewhere.
  // Use a WHATWG URL — NextURL keeps the trailing slash on Location.
  if (pathname !== "/" && pathname.endsWith("/")) {
    const url = new URL(request.url);
    url.pathname = pathname.replace(/\/+$/, "") || "/";
    return NextResponse.redirect(url, 308);
  }

  if (isAdminHtmlPath(pathname)) {
    const response = nextWithPathname(request);
    applyAdminHtmlSecurityHeaders(response.headers);
    return response;
  }

  // Exact first segment `/api`, not the prefix — `/api-2` is a guest slug.
  if (pathname.startsWith("/api/")) {
    return nextWithPathname(request);
  }

  const guestToken = guestInviteTokenFromPathname(pathname);
  if (guestToken) {
    let resolved: Awaited<ReturnType<typeof resolvePartyByGuestToken>>;
    try {
      resolved = await resolvePartyByGuestToken(guestToken);
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = MISSING_GUEST_REWRITE;
      return NextResponse.rewrite(url);
    }
    if (resolved.status === "missing") {
      const url = request.nextUrl.clone();
      url.pathname = MISSING_GUEST_REWRITE;
      return NextResponse.rewrite(url);
    }
    if (resolved.status === "unpublished") return nextWithPathname(request);
    const response = nextWithPathname(request);
    const { name, value, ...options } = await guestEventCookie(resolved.id, resolved.guestToken);
    response.cookies.set(name, value, options);
    return response;
  }

  if (pathname.startsWith("/g/")) {
    const url = request.nextUrl.clone();
    url.pathname = MISSING_GUEST_REWRITE;
    return NextResponse.rewrite(url);
  }

  const slug = guestSlugFromPathname(pathname);
  if (!slug) return nextWithPathname(request);
  // A transient DB failure here must not 500 in middleware. Rewrite to the
  // dedicated 503 handler instead: caches and monitors see HTTP 503 +
  // Retry-After while the guest keeps their URL and branded copy.
  let exists: boolean;
  try {
    exists = await partyExists(slug);
  } catch (err) {
    console.error("proxy partyExists lookup failed", err);
    const url = request.nextUrl.clone();
    url.pathname = TRIP_UNAVAILABLE_REWRITE;
    return NextResponse.rewrite(url);
  }
  if (exists) return nextWithPathname(request);

  const url = request.nextUrl.clone();
  url.pathname = MISSING_GUEST_REWRITE;
  return NextResponse.rewrite(url);
}

/**
 * Catch-all for guest `/:slug` (and other public paths). Reserved app routes
 * are excluded as exact first segments (`api`, `api/…`, `admin`, `admin/…`),
 * not prefixes — otherwise `uniqueSlug("admin")` → `admin-2` / `admin-3` and
 * `uniqueSlug("api")` → `api-2` never hit the missing-slug rewrite and SSR
 * Next's `__next_error__` shell. `/admin` and `/admin/:path*` are listed
 * separately so those HTML routes still get security headers. `/api` and
 * `/api/:path*` are listed so exact `/api` and `/api/` return JSON 404 (and
 * other `/api/…/` paths still 308-strip) under skipTrailingSlashRedirect.
 * `/api-2` is not an `/api` segment and still hits the guest matcher.
 *
 * Duplicated inline in `config.matcher`: Next requires matcher entries to be
 * static string literals.
 */
export const API_ROOT_MATCHER = "/api";
export const API_SUBPATH_MATCHER = "/api/:path*";

export const GUEST_PATH_MATCHER =
  "/((?!api(?:/|$)|_next|_not-found|favicon.ico|icon.svg|admin(?:/|$)).*)";

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api",
    "/api/:path*",
    "/((?!api(?:/|$)|_next|_not-found|favicon.ico|icon.svg|admin(?:/|$)).*)",
  ],
};
