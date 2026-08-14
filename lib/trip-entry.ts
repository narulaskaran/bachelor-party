import { slugFromName } from "@/lib/slug";

// Same rule the admin API uses for trip slugs (lib/party-schema.ts).
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function looksLikeHostPath(value: string): boolean {
  const slash = value.indexOf("/");
  if (slash < 1) return false;
  const host = value.slice(0, slash);
  return host.includes(".") || host.startsWith("localhost");
}

/** First path segment from a slug, "/slug", or invite URL. */
export function tripSlugFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const asUrl = trimmed.includes("://")
    ? trimmed
    : looksLikeHostPath(trimmed)
      ? `https://${trimmed}`
      : null;

  let segment = trimmed.replace(/^\/+/, "").split(/[/?#]/)[0] ?? "";
  if (asUrl) {
    try {
      const url = new URL(asUrl);
      const fromPath = url.pathname.split("/").filter(Boolean)[0];
      if (!fromPath) return null;
      segment = decodeURIComponent(fromPath);
    } catch {
      // Keep the slash-stripped fallback above.
    }
  } else if (segment.includes(".")) {
    // A hostname with no path isn't a trip code.
    return null;
  }

  if (!segment) return null;
  const slug = SLUG_RE.test(segment) ? segment : slugFromName(segment);
  if (!slug || !SLUG_RE.test(slug)) return null;
  return slug;
}

/** Path to open for a typed slug or pasted invite URL, or null if unusable. */
export function tripPathFromInput(raw: string): string | null {
  const slug = tripSlugFromInput(raw);
  return slug ? `/${slug}` : null;
}
