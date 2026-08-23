import {
  TRIP_UNAVAILABLE_HEADING,
  TRIP_UNAVAILABLE_MESSAGE,
} from "@/components/trip-unavailable";

/**
 * Real HTTP 503 for transient database failures on `/:slug`.
 *
 * App Router pages cannot set a response status, so the proxy rewrites a
 * failed slug lookup here (`TRIP_UNAVAILABLE_REWRITE`): caches and monitors
 * see 503 + Retry-After while guests keep their URL and a branded page.
 * Copy matches the page-level fallback in `components/trip-unavailable.tsx`.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Conservative hint for crawlers/retry logic; the outage is expected to be brief.
const RETRY_AFTER_SECONDS = "60";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function unavailableHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TRIP_UNAVAILABLE_HEADING)} — The Big Send</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center;
         justify-content: center; background: #fafaf9; color: #1c1917;
         font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  main { max-width: 24rem; width: 100%; margin: 0 1rem; padding: 2rem;
         border: 1px solid #e7e5e4; border-radius: 0.75rem; background: #fff;
         box-shadow: 0 1px 2px rgb(0 0 0 / 0.05); text-align: center; }
  .brand { font-size: 0.875rem; color: #78716c; }
  h1 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.025em; margin: 0.5rem 0 0; }
  p { font-size: 0.875rem; color: #78716c; line-height: 1.6; }
</style>
</head>
<body>
<main>
  <p class="brand">The Big Send</p>
  <h1>${esc(TRIP_UNAVAILABLE_HEADING)}</h1>
  <p>${esc(TRIP_UNAVAILABLE_MESSAGE)}</p>
</main>
</body>
</html>`;
}

export async function GET(): Promise<Response> {
  return new Response(unavailableHtml(), {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": RETRY_AFTER_SECONDS,
      "cache-control": "no-store",
    },
  });
}
