import { sha256hex } from "@/lib/cookie-hash";

export const AUTH_COOKIE = "bp_access";

// Cookie format: "<partyId>.<token>" where token binds the party id to its
// password, so the plaintext never sits in the browser and a cookie for one
// party can't unlock another. Works in both Node and edge runtimes.
export async function partyToken(
  partyId: string,
  password: string
): Promise<string> {
  return sha256hex(`bp-v2:${partyId}:${password}`);
}

export async function authCookieValue(
  partyId: number | "demo",
  password: string
): Promise<string> {
  return `${partyId}.${await partyToken(String(partyId), password)}`;
}
