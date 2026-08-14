import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(openApiSpec(), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
