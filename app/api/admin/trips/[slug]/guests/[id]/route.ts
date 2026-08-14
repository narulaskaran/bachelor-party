import { DELETE as deleteGuest } from "@/lib/admin-api/guest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function DELETE(request: Request, ctx: Ctx) {
  return deleteGuest(request, ctx);
}
