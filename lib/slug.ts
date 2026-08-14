const SLUG_MAX = 80;

/**
 * First path segments that already have handlers (or a special built-in
 * trip). Creating `/{slug}` for these would never render that trip.
 *
 * - admin — admin UI (`/admin`, `/admin/login`)
 * - api — API (`/api/*`)
 * - rsvp, schedule, activities, basecamp — redirects to `/#…`
 * - login — historical `/login`; would collide if restored
 * - demo — built-in demo trip at `/demo`
 */
export const RESERVED_SLUGS = [
  "activities",
  "admin",
  "api",
  "basecamp",
  "demo",
  "login",
  "rsvp",
  "schedule",
] as const;

const reserved = new Set<string>(RESERVED_SLUGS);

export function isReservedSlug(slug: string): boolean {
  return reserved.has(slug);
}

export const RESERVED_SLUG_MESSAGE =
  `slug is reserved (collides with an app route: ${RESERVED_SLUGS.join(", ")})`;

/** Lowercase kebab-case from a display name. Empty if nothing usable remains. */
export function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export async function uniqueSlug(
  base: string,
  taken: (candidate: string) => boolean | Promise<boolean>,
): Promise<string> {
  const root = (base || "trip").slice(0, SLUG_MAX);
  const blocked = async (candidate: string) =>
    isReservedSlug(candidate) || Boolean(await taken(candidate));
  if (!(await blocked(root))) return root;
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, SLUG_MAX - suffix.length)}${suffix}`;
    if (!(await blocked(candidate))) return candidate;
  }
  throw new Error("Could not allocate a unique slug");
}
