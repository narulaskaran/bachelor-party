import { randomBytes } from "node:crypto";

const GUEST_TOKEN_BYTES = 16;
const GUEST_TOKEN_RE = /^[0-9a-f]{32}$/;

export function unguessableGuestToken(): string {
  return randomBytes(GUEST_TOKEN_BYTES).toString("hex");
}

export function isGuestInviteToken(value: string): boolean {
  return GUEST_TOKEN_RE.test(value);
}

export function guestInvitePath(token: string): string {
  return `/g/${token}`;
}

/** Published guest door: minted `/g/{token}`, or legacy `/{slug}` when no token. */
export function publishedGuestPath(party: {
  guestToken?: string | null;
  slug: string;
}): string {
  if (party.guestToken && isGuestInviteToken(party.guestToken)) {
    return guestInvitePath(party.guestToken);
  }
  return `/${party.slug}`;
}
