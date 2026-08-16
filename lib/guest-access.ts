"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authCookieValue } from "@/lib/auth";
import { resolvePartyBySlug, type ResolvedSlugParty } from "@/lib/resolve-party";

const NINETY_DAYS = 60 * 60 * 24 * 90;

export async function setGuestAccessCookie(
  partyId: number | "demo",
  password: string,
) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, await authCookieValue(partyId, password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: NINETY_DAYS,
    path: "/",
  });
}

/** Set the guest cookie (when gated) and send them to the trip page. */
export async function unlockGuestTrip(
  slug: string,
  password: string,
): Promise<{ error?: string }> {
  const attempt = password.trim();
  if (!attempt) return { error: "Enter the password." };

  let resolved: ResolvedSlugParty;
  try {
    resolved = await resolvePartyBySlug(slug);
  } catch (err) {
    console.error("guest unlock lookup failed", err);
    return { error: "Couldn't check that — try again in a minute." };
  }

  // redirect() throws; keep it outside the lookup try/catch so it isn't
  // swallowed as a DB error.
  if (resolved.status === "open") {
    redirect(`/${slug}`);
  }

  if (resolved.status !== "gated" || attempt !== resolved.password) {
    return { error: "Wrong password. Ask the group chat." };
  }

  await setGuestAccessCookie(resolved.id, resolved.password);
  redirect(`/${slug}`);
}

/** Form action from the organizer packet: open the trip as a guest. */
export async function openAsGuest(slug: string, password: string) {
  return unlockGuestTrip(slug, password);
}
