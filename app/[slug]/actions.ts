"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authCookieValue } from "@/lib/auth";
import { resolvePartyBySlug } from "@/lib/resolve-party";
import type { ResolvedSlugParty } from "@/lib/resolve-party";

const NINETY_DAYS = 60 * 60 * 24 * 90;

export async function login(
  slug: string,
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const attempt = String(formData.get("password") ?? "").trim();
  if (!attempt) return { error: "Enter the password." };

  let resolved: ResolvedSlugParty;
  try {
    resolved = await resolvePartyBySlug(slug);
  } catch (err) {
    console.error("login lookup failed", err);
    return { error: "Couldn't check that — try again in a minute." };
  }

  // Open sample trip needs no password. redirect() throws; keep it
  // outside the lookup try/catch so it isn't swallowed as a DB error.
  if (resolved.status === "open") {
    redirect(`/${slug}`);
  }

  if (resolved.status !== "gated" || attempt !== resolved.password) {
    return { error: "Wrong password. Ask the group chat." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, await authCookieValue(resolved.id, resolved.password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: NINETY_DAYS,
    path: "/",
  });

  redirect(`/${slug}`);
}
