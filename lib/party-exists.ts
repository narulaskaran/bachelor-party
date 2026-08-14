import { resolvePartyBySlug } from "@/lib/resolve-party";

/** Single-segment guest slug, or null if this path isn't a trip URL. */
export function guestSlugFromPathname(pathname: string): string | null {
  if (pathname === "/" || pathname === "/_not-found") return null;
  const parts = pathname.slice(1).split("/");
  if (parts.length !== 1) return null;
  return parts[0] || null;
}

/** True when `/:slug` should serve a trip (login or content), not the branded 404. */
export async function partyExists(slug: string): Promise<boolean> {
  const resolved = await resolvePartyBySlug(slug);
  return resolved.status !== "missing";
}
