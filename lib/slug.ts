const SLUG_MAX = 80;

/** Paths that already mean something in the app — never assign these as trip slugs. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "create",
  "login",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

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
  if (!(await taken(root))) return root;
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, SLUG_MAX - suffix.length)}${suffix}`;
    if (!(await taken(candidate))) return candidate;
  }
  throw new Error("Could not allocate a unique slug");
}
