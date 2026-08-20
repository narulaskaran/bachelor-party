import { resolvePartyBySlug } from "@/lib/resolve-party";
import { isGuestInviteToken } from "@/lib/guest-invite";

/**
 * Unmatched two-segment path. Rewriting here lets App Router SSR
 * `app/not-found.tsx` with HTTP 404. `/_not-found` itself is a compiled
 * matched route (often HTTP 200 when rewritten to).
 */
export const MISSING_GUEST_REWRITE = "/_not-found/guest";

/** Single-segment guest slug, or null if this path isn't a trip URL. */
export function guestSlugFromPathname(pathname: string): string | null {
  if (pathname === "/" || pathname === "/_not-found" || pathname === MISSING_GUEST_REWRITE) {
    return null;
  }
  const parts = pathname.slice(1).split("/");
  if (parts.length !== 1) return null;
  return parts[0] || null;
}

/** True when `/:slug` should serve a trip (login or content), not the branded 404. */
export async function partyExists(slug: string): Promise<boolean> {
  const resolved = await resolvePartyBySlug(slug);
  // An unpublished row is private draft state, not a public route. Treat it
  // like a missing trip so the proxy cannot leak its existence.
  if (resolved.status !== "open" && resolved.status !== "gated") return false;
  // New R1 events use `/g/:token` as the guest door. The slug is the organizer
  // workspace (`/{slug}/host`), not a second guest URL.
  if (resolved.status === "gated" && resolved.guestToken) return false;
  return true;
}

/** Guest invite token from `/g/:token`, or null. */
export function guestInviteTokenFromPathname(pathname: string): string | null {
  const parts = pathname.slice(1).split("/");
  if (parts.length !== 2 || parts[0] !== "g") return null;
  const token = parts[1]?.toLowerCase() ?? "";
  return isGuestInviteToken(token) ? token : null;
}
