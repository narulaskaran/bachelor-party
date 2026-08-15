export const DEFAULT_INVITE_HOST = "party.narula.xyz";

export function inviteHostFromHeaders(headerList: {
  get(name: string): string | null;
}): string {
  const raw = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const host = raw?.split(",")[0]?.trim();
  return host || DEFAULT_INVITE_HOST;
}
