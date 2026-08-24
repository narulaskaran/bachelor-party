import { POST as postPublish } from "@/lib/admin-api/publish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: Request, ctx: Ctx) {
  return postPublish(request, ctx);
}
