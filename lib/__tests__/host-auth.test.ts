import { describe, expect, it } from "vitest";
import { authCookieValue } from "@/lib/auth";
import { cookieAuthenticatesHost, hostCookieValue } from "@/lib/host-auth";

describe("cookieAuthenticatesHost", () => {
  it("returns false when no cookie is present", async () => {
    expect(await cookieAuthenticatesHost(undefined, 1, "host-tok")).toBe(false);
  });

  it("returns true when the cookie matches this party's id and host key", async () => {
    const cookie = await hostCookieValue(1, "host-tok");
    expect(await cookieAuthenticatesHost(cookie, 1, "host-tok")).toBe(true);
  });

  it("returns false when the cookie is for a different party id", async () => {
    const cookie = await hostCookieValue(2, "host-tok");
    expect(await cookieAuthenticatesHost(cookie, 1, "host-tok")).toBe(false);
  });

  it("does not accept a guest password cookie as a host session", async () => {
    const guest = await authCookieValue(1, "host-tok");
    expect(await cookieAuthenticatesHost(guest, 1, "host-tok")).toBe(false);
  });
});
