import { GET as getCollection, POST as postCollection } from "@/lib/admin-api/collection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  return getCollection(request);
}

export async function POST(request: Request) {
  return postCollection(request);
}
