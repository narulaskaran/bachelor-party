import { GET as getCollection, POST as postCollection } from "@/lib/admin-api/collection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Must stay above PLAN_EXTRACT_TIMEOUT_MS (50s) plus slug/insert work.
export const maxDuration = 60;

export async function GET(request: Request) {
  return getCollection(request);
}

export async function POST(request: Request) {
  return postCollection(request);
}
