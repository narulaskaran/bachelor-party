import { GET as getCollection, POST as postCollection } from "@/lib/admin-api/collection";
import { CREATE_TRIP_MAX_DURATION_SECONDS } from "@/lib/plan-ingest-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = CREATE_TRIP_MAX_DURATION_SECONDS;

export async function GET(request: Request) {
  return getCollection(request);
}

export async function POST(request: Request) {
  return postCollection(request);
}
