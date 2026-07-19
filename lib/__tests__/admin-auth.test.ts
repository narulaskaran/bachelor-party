/** Tests for lib/admin-auth.ts requireAdmin() */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireAdmin } from "../admin-auth";

// Helpers — no external deps.
function makeRequest(token: string | null): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request("http://localhost", { headers });
}

describe("requireAdmin", () => {
  let oldToken: string | undefined;

  beforeEach(() => {
    oldToken = process.env.ADMIN_API_TOKEN;
  });

  afterEach(() => {
    if (oldToken !== undefined) {
      process.env.ADMIN_API_TOKEN = oldToken;
    } else {
      delete process.env.ADMIN_API_TOKEN;
    }
  });

  // --- No token at all ---
  it("returns 401 when no Authorization header", () => {
    const res = requireAdmin(makeRequest(null));
    expect(res!.status).toBe(401);
  });

  it("returns 401 when Authorization is not Bearer", () => {
    const headers = new Headers();
    headers.set("authorization", "Basic dXNlcjpwYXNz");
    const req = new Request("http://localhost", { headers });
    const res = requireAdmin(req);
    expect(res!.status).toBe(401);
  });

  it("returns 401 when Bearer token is missing (empty)", () => {
    const headers = new Headers();
    headers.set("authorization", "Bearer ");
    const req = new Request("http://localhost", { headers });
    const res = requireAdmin(req);
    expect(res!.status).toBe(401);
  });

  // --- Global token only (no partyToken option) ---
  it("succeeds with correct global token", () => {
    process.env.ADMIN_API_TOKEN = "global-secret";
    const res = requireAdmin(makeRequest("global-secret"));
    expect(res).toBeNull();
  });

  it("returns 401 with wrong global token", () => {
    process.env.ADMIN_API_TOKEN = "global-secret";
    const res = requireAdmin(makeRequest("wrong"));
    expect(res!.status).toBe(401);
  });

  it("returns 503 when global token is not set", () => {
    delete process.env.ADMIN_API_TOKEN;
    const res = requireAdmin(makeRequest("any-token"));
    expect(res!.status).toBe(503);
  });

  // --- Party token present and correct ---
  it("succeeds with matching party token (even without global)", () => {
    process.env.ADMIN_API_TOKEN = "global-secret";
    const res = requireAdmin(makeRequest("party-1"), { partyToken: "party-1" });
    expect(res).toBeNull();
  });

  it("succeeds with party token even when global is unset", () => {
    delete process.env.ADMIN_API_TOKEN;
    const res = requireAdmin(makeRequest("my-party-token"), { partyToken: "my-party-token" });
    expect(res).toBeNull();
  });

  // --- Party token wrong, falls through to global ---
  it("falls through to global when party token doesn't match request token", () => {
    process.env.ADMIN_API_TOKEN = "global-secret";
    const res = requireAdmin(makeRequest("global-secret"), { partyToken: "wrong-party" });
    expect(res).toBeNull(); // falls through, global matches
  });

  it("returns 401 when party token wrong and global also doesn't match", () => {
    process.env.ADMIN_API_TOKEN = "global-secret";
    const res = requireAdmin(makeRequest("also-wrong"), { partyToken: "wrong-party" });
    expect(res!.status).toBe(401); // falls through, neither matches global
  });

  it("succeeds if party token wrong but global matches in fallback", () => {
    process.env.ADMIN_API_TOKEN = "global-secret";
    const res = requireAdmin(makeRequest("global-secret"), { partyToken: "wrong-party" });
    expect(res).toBeNull(); // fell through to superadmin
  });

  // --- Timing-safe comparison sanity ---
  it("rejects party token with different length", () => {
    process.env.ADMIN_API_TOKEN = "global";
    const res = requireAdmin(makeRequest("short"), { partyToken: "longer-partypass" });
    expect(res!.status).toBe(401);
  });

  // --- Empty string partyToken handled correctly ---
  it("treats empty-string partyToken as 'not provided'", () => {
    process.env.ADMIN_API_TOKEN = "global-secret";
    const res = requireAdmin(makeRequest("global-secret"), { partyToken: "" });
    expect(res).toBeNull(); // falls through to global, which matches
  });

  it("treats empty-string partyToken as 'not provided' when global doesn't match", () => {
    process.env.ADMIN_API_TOKEN = "global-secret";
    const res = requireAdmin(makeRequest("wrong"), { partyToken: "" });
    expect(res!.status).toBe(401); // global doesn't match either
  });
});
