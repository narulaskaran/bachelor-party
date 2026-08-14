import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Catch-all for unmatched `/api/*` paths.
 *
 * App Router only has Route Handlers for paths with a `route.ts`. Anything else
 * falls through to the HTML `_not-found` page. GET of that page is 404;
 * POST/PUT/PATCH/DELETE are 200 `text/html` with `x-matched-path: /_not-found`
 * (easy to treat as success in scripts). This handler is more specific than
 * `_not-found` and less specific than real API routes (`admin/trips`, `openapi`),
 * so those still win. `afterFiles` rewrites (`/api/admin/parties`, `/api/openapi.json`)
 * also run before this dynamic route.
 */
function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;
export const OPTIONS = notFound;
