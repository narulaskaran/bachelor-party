import { describe, expect, it } from "vitest";
import { authCookieValue } from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/cookie-hash";
import {
  cookieAuthenticatesHost,
  HOST_COOKIE,
  hostCookieValue,
  hostSessionCookie,
  isWrongHostKeyError,
  WRONG_HOST_KEY,
} from "@/lib/host-auth";

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

describe("isWrongHostKeyError", () => {
  it("matches the host-key gate copy without treating other errors as auth failures", () => {
    expect(isWrongHostKeyError(WRONG_HOST_KEY)).toBe(true);
    expect(isWrongHostKeyError("Couldn't save that draft — try again in a minute.")).toBe(false);
  });
});

describe("hostSessionCookie", () => {
  it("create-set cookies use the same name, hash, and options host checks accept", async () => {
    const cookie = await hostSessionCookie(4, "party-tok");
    expect(cookie.name).toBe(HOST_COOKIE);
    expect(cookie).toMatchObject(sessionCookieOptions());
    expect(cookie.path).toBe("/");
    expect(await cookieAuthenticatesHost(cookie.value, 4, "party-tok")).toBe(true);
    expect(cookie.value).toBe(await hostCookieValue(4, "party-tok"));
    expect(cookie.value).not.toBe("party-tok");
  });
});
