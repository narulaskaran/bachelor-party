export const DEFAULT_INVITE_HOST = "party.narula.xyz";
export const CANONICAL_ORIGIN = `https://${DEFAULT_INVITE_HOST}`;

/** Retired Vercel production aliases. Preview `*.vercel.app` hosts stay as-is. */
export const LEGACY_PRODUCTION_HOSTS = [
  "bachelor-party-eight.vercel.app",
  "www.bachelor-party-eight.vercel.app",
] as const;

function firstHeaderHost(headerList: {
  get(name: string): string | null;
}): string | undefined {
  const raw = headerList.get("x-forwarded-host") ?? headerList.get("host");
  return raw?.split(",")[0]?.trim() || undefined;
}

function hostnameOf(host: string): string {
  return host.trim().toLowerCase().split(":")[0] ?? host;
}

export function isLegacyProductionHost(host: string): boolean {
  return (LEGACY_PRODUCTION_HOSTS as readonly string[]).includes(hostnameOf(host));
}

export function inviteHostFromHeaders(headerList: {
  get(name: string): string | null;
}): string {
  const host = firstHeaderHost(headerList);
  if (!host || isLegacyProductionHost(host)) return DEFAULT_INVITE_HOST;
  return host;
}

/** Invite origin for organizer packets. Canonicalizes the old Vercel alias. */
export function publicOriginFromRequest(request: Request): string {
  const url = new URL(request.url);
  const host = firstHeaderHost(request.headers) ?? url.host;
  if (isLegacyProductionHost(host)) return CANONICAL_ORIGIN;
  return url.origin;
}

/** 308 target for the retired production alias, or null when the host is fine. */
export function canonicalRedirectLocation(request: {
  headers: { get(name: string): string | null };
  nextUrl: URL;
}): URL | null {
  const host = firstHeaderHost(request.headers) ?? request.nextUrl.host;
  if (!isLegacyProductionHost(host)) return null;
  const dest = new URL(request.nextUrl.href);
  dest.protocol = "https:";
  dest.hostname = DEFAULT_INVITE_HOST;
  dest.port = "";
  return dest;
}

export function legacyProductionHostRedirects(): {
  source: string;
  has: { type: "host"; value: string }[];
  destination: string;
  permanent: true;
}[] {
  return LEGACY_PRODUCTION_HOSTS.flatMap((host) => [
    {
      source: "/",
      has: [{ type: "host" as const, value: host }],
      destination: `${CANONICAL_ORIGIN}/`,
      permanent: true as const,
    },
    {
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `${CANONICAL_ORIGIN}/:path*`,
      permanent: true as const,
    },
  ]);
}
