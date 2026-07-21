import { describe, it, expect } from "vitest";
import { authCookieValue } from "@/lib/auth";
import { cookieAuthenticatesParty } from "@/lib/party-auth";

describe("cookieAuthenticatesParty", () => {
  it("returns false when no cookie is present", async () => {
    const result = await cookieAuthenticatesParty(undefined, 1, "secret");
    expect(result).toBe(false);
  });

  it("returns true when the cookie matches this party's id and password", async () => {
    const cookie = await authCookieValue(1, "secret");
    const result = await cookieAuthenticatesParty(cookie, 1, "secret");
    expect(result).toBe(true);
  });

  it("returns false when the cookie is for a different party id", async () => {
    const cookie = await authCookieValue(2, "secret");
    const result = await cookieAuthenticatesParty(cookie, 1, "secret");
    expect(result).toBe(false);
  });

  it("returns false when the password has changed since the cookie was issued", async () => {
    const cookie = await authCookieValue(1, "old-secret");
    const result = await cookieAuthenticatesParty(cookie, 1, "new-secret");
    expect(result).toBe(false);
  });

  it("works with the 'demo' party id", async () => {
    const cookie = await authCookieValue("demo", "demo-pass");
    const result = await cookieAuthenticatesParty(cookie, "demo", "demo-pass");
    expect(result).toBe(true);
  });
});
