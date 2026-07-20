import { authCookieValue } from "./auth";

// Pure check: does this raw cookie value authenticate this specific party?
// No DB/cookies() dependency, so it's directly unit-testable.
export async function cookieAuthenticatesParty(
  rawCookie: string | undefined,
  partyId: number | "demo",
  password: string
): Promise<boolean> {
  if (!rawCookie) return false;
  return rawCookie === (await authCookieValue(partyId, password));
}
