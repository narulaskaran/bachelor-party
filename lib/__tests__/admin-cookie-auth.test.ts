import { describe, it, expect } from "vitest";
import { adminCookieValue, cookieAuthenticatesAdmin } from "@/lib/admin-cookie-auth";

describe("cookieAuthenticatesAdmin", () => {
  it("returns true when the cookie matches the configured password", async () => {
    const cookie = await adminCookieValue("secret");
    const result = await cookieAuthenticatesAdmin(cookie, "secret");
    expect(result).toBe(true);
  });

  it("returns false when the password doesn't match", async () => {
    const cookie = await adminCookieValue("secret");
    const result = await cookieAuthenticatesAdmin(cookie, "different");
    expect(result).toBe(false);
  });

  it("returns false for a garbage cookie value", async () => {
    const result = await cookieAuthenticatesAdmin("not-a-real-hash", "secret");
    expect(result).toBe(false);
  });

  it("doesn't collide with the party auth cookie scheme for the same password", async () => {
    // admin-cookie-auth namespaces its hash input ("admin-ui:") so a party
    // password can't be replayed as an admin cookie or vice versa.
    const partyStyleCookie = await adminCookieValue("shared-secret");
    const result = await cookieAuthenticatesAdmin(partyStyleCookie, "shared-secret");
    expect(result).toBe(true);
    expect(await cookieAuthenticatesAdmin("shared-secret", "shared-secret")).toBe(false);
  });
});
