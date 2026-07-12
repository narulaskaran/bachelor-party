"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AUTH_COOKIE, authCookieValue } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

const NINETY_DAYS = 60 * 60 * 24 * 90;

export async function login(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const attempt = String(formData.get("password") ?? "").trim();
  if (!attempt) return { error: "Enter the password." };

  const db = getDb();
  let cookieValue: string | null = null;

  if (db) {
    // The password identifies the party — one shared secret per trip.
    try {
      const [party] = await db
        .select({ id: schema.parties.id, password: schema.parties.password })
        .from(schema.parties)
        .where(eq(schema.parties.password, attempt))
        .limit(1);
      if (party) cookieValue = await authCookieValue(party.id, party.password);
    } catch (err) {
      console.error("login lookup failed", err);
      return { error: "Couldn't check that — try again in a minute." };
    }
  } else {
    const expected = process.env.PARTY_PASSWORD;
    if (!expected) {
      return { error: "Site isn't configured yet. Ping the organizer." };
    }
    if (attempt === expected) {
      cookieValue = await authCookieValue("demo", expected);
    }
  }

  if (!cookieValue) {
    return { error: "Wrong password. Ask the group chat." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: NINETY_DAYS,
    path: "/",
  });

  const from = String(formData.get("from") ?? "");
  redirect(from.startsWith("/") && !from.startsWith("//") ? from : "/");
}
