import { NextResponse } from "next/server";

/** JSON 404 for `/api`, `/api/`, and unmatched `/api/*`. */
export function apiNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
