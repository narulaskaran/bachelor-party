export const AUTH_COOKIE = "bp_access";

// Cookie format: "<partyId>.<token>" where token binds the party id to its
// password, so the plaintext never sits in the browser and a cookie for one
// party can't unlock another. Works in both Node and edge runtimes.
export async function partyToken(
  partyId: string,
  password: string
): Promise<string> {
  const data = new TextEncoder().encode(`bp-v2:${partyId}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function authCookieValue(
  partyId: number | "demo",
  password: string
): Promise<string> {
  return `${partyId}.${await partyToken(String(partyId), password)}`;
}
