import { GET as getCollection, POST as postCollection } from "@/lib/admin-api/collection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Numeric literal required by Next segment config. Keep equal to CREATE_TRIP_MAX_DURATION_SECONDS. */
export const maxDuration = 40;

export async function GET(request: Request) {
  return getCollection(request);
}

export async function POST(request: Request) {
  return postCollection(request);
}
