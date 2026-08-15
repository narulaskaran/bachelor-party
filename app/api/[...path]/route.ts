import { apiNotFound } from "@/lib/api-not-found";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Catch-all for unmatched `/api/*` paths. Exact `/api` and `/api/` are the
 * sibling `app/api/route.ts` index (same JSON 404).
 *
 * App Router only has Route Handlers for paths with a `route.ts`. Anything else
 * falls through to the HTML `_not-found` page. GET of that page is 404;
 * POST/PUT/PATCH/DELETE are 200 `text/html` with `x-matched-path: /_not-found`
 * (easy to treat as success in scripts). This handler is more specific than
 * `_not-found` and less specific than real API routes (`admin/trips`, `openapi`),
 * so those still win. `afterFiles` rewrites (`/api/admin/parties`, `/api/openapi.json`)
 * also run before this dynamic route.
 */
export const GET = apiNotFound;
export const POST = apiNotFound;
export const PUT = apiNotFound;
export const PATCH = apiNotFound;
export const DELETE = apiNotFound;
export const HEAD = apiNotFound;
export const OPTIONS = apiNotFound;
