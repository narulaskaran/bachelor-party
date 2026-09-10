import { GET as getCollection, POST as postCollection } from "@/lib/admin-api/collection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
<<<<<<< HEAD
/** Numeric literal required by Next segment config. Keep equal to CREATE_TRIP_MAX_DURATION_SECONDS. */
=======
// Next.js requires a statically analyzable literal. Keep in sync with
// CREATE_TRIP_MAX_DURATION_SECONDS (40) in lib/plan-ingest-errors.ts.
>>>>>>> d00ea54 (fix: export create-trip maxDuration as a numeric literal)
export const maxDuration = 40;

export async function GET(request: Request) {
  return getCollection(request);
}

export async function POST(request: Request) {
  return postCollection(request);
}
