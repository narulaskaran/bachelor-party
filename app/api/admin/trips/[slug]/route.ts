import {
  DELETE as deleteItem,
  GET as getItem,
  PATCH as patchItem,
} from "@/lib/admin-api/item";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return getItem(request, ctx);
}

export async function PATCH(request: Request, ctx: Ctx) {
  return patchItem(request, ctx);
}

export async function DELETE(request: Request, ctx: Ctx) {
  return deleteItem(request, ctx);
}
