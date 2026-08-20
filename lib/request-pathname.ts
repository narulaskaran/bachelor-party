/** Request pathname as seen by proxy. Used so guest RSVP binds to `/g/{token}`, not leftover cookies. */

export const REQUEST_PATHNAME_HEADER = "x-bigsend-pathname";

export function pathnameFromHeaders(headersList: Headers): string | null {
  const raw = headersList.get(REQUEST_PATHNAME_HEADER);
  if (!raw || raw[0] !== "/") return null;
  const path = raw.split("?")[0] ?? "";
  if (!path || path.includes("\\") || path.includes("//")) return null;
  return path;
}
