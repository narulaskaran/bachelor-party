import { slugFromName } from "@/lib/slug";
import { isGuestInviteToken, guestInvitePath } from "@/lib/guest-invite";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function looksLikeHostPath(value: string): boolean {
  const slash = value.indexOf("/");
  if (slash < 1) return false;
  const host = value.slice(0, slash);
  return host.includes(".") || host.startsWith("localhost");
}

function pathSegmentsFromInput(raw: string): string[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const asUrl = trimmed.includes("://")
    ? trimmed
    : looksLikeHostPath(trimmed)
      ? `https://${trimmed}`
      : null;

  if (asUrl) {
    try {
      const url = new URL(asUrl);
      return url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
    } catch {
      return null;
    }
  }

  if (trimmed.includes(".") && !trimmed.includes("/")) return null;
  return trimmed.replace(/^\/+/, "").split(/[/?#]/).filter(Boolean);
}

/** First path segment from a slug, "/slug", or invite URL. */
export function tripSlugFromInput(raw: string): string | null {
  const segments = pathSegmentsFromInput(raw);
  if (!segments?.length) return null;
  if (segments[0] === "g") return null;
  const segment = segments[0] ?? "";
  if (isGuestInviteToken(segment)) return null;
  const slug = SLUG_RE.test(segment) ? segment : slugFromName(segment);
  if (!slug || !SLUG_RE.test(slug)) return null;
  return slug;
}

export function guestInvitePathFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (isGuestInviteToken(trimmed)) return guestInvitePath(trimmed);
  const segments = pathSegmentsFromInput(raw);
  if (!segments?.length) return null;
  if (segments[0] === "g" && segments[1] && isGuestInviteToken(segments[1].toLowerCase())) {
    return guestInvitePath(segments[1].toLowerCase());
  }
  if (segments.length === 1 && isGuestInviteToken(segments[0].toLowerCase())) {
    return guestInvitePath(segments[0].toLowerCase());
  }
  return null;
}

/** Path to open for a typed slug, guest token, or pasted invite URL. */
export function tripPathFromInput(raw: string): string | null {
  const guest = guestInvitePathFromInput(raw);
  if (guest) return guest;
  const slug = tripSlugFromInput(raw);
  return slug ? `/${slug}` : null;
}
