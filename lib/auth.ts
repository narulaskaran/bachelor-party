export const AUTH_COOKIE = "bp_access";

// Cookie stores a SHA-256 hash of the password so the plaintext never
// sits in the browser. Works in both Node and edge runtimes.
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`bp-v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
