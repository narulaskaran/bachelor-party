/** Old multi-page paths. Each 307s to `/#hash` on `/` (next.config). */
export const LEGACY_PAGE_HASHES = [
  "schedule",
  "activities",
  "basecamp",
  "rsvp",
] as const;

export const LEGACY_PAGE_REDIRECTS = LEGACY_PAGE_HASHES.map((hash) => ({
  source: `/${hash}`,
  destination: `/#${hash}`,
  permanent: false as const,
}));
