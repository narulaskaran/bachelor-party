import { apiNotFound } from "@/lib/api-not-found";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Exact `/api` and `/api/` (no subpath).
 *
 * `[...path]` only matches `/api/:segment+`, so the API root used to fall
 * through to Next's `__next_error__` HTML shell (HTTP 404, empty h1). Same
 * JSON body as unmatched `/api/*` (issue #82 / #87).
 */
export const GET = apiNotFound;
export const POST = apiNotFound;
export const PUT = apiNotFound;
export const PATCH = apiNotFound;
export const DELETE = apiNotFound;
export const HEAD = apiNotFound;
export const OPTIONS = apiNotFound;
