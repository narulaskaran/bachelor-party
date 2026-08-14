import { GET as getGuests } from "@/lib/admin-api/guests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return getGuests(request, ctx);
}
