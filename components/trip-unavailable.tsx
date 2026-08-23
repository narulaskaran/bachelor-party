import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Shared copy for the transient DB-failure state, also used verbatim by the
// /api/trip-unavailable 503 handler so both surfaces stay word-identical.
export const TRIP_UNAVAILABLE_HEADING = "One sec";
export const TRIP_UNAVAILABLE_MESSAGE =
  "We couldn\u2019t load this trip just now. Try again in a minute.";

/**
 * Branded retry state shown when a trip lookup fails transiently (e.g. the
 * database is briefly unreachable). Rendered by `app/[slug]/page.tsx` as a
 * last-resort fallback; the proxy normally rewrites failed lookups to the
 * real HTTP 503 handler before the page ever runs.
 */
export function TripUnavailable() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {TRIP_UNAVAILABLE_HEADING}
          </h1>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            {TRIP_UNAVAILABLE_MESSAGE}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
