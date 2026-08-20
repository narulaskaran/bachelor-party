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
