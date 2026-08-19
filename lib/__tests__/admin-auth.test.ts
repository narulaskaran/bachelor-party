/** Tests for lib/admin-auth.ts — trip-scoped adminToken only. */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readBearerToken, requireAdmin } from "../admin-auth";

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

  it("returns 401 when no Authorization header", () => {
    const res = requireAdmin(makeRequest(null), { partyToken: "party-1" });
    expect(res!.status).toBe(401);
  });

  it("returns 401 when Authorization is not Bearer", () => {
    const headers = new Headers();
    headers.set("authorization", "Basic dXNlcjpwYXNz");
    const req = new Request("http://localhost", { headers });
    const res = requireAdmin(req, { partyToken: "party-1" });
    expect(res!.status).toBe(401);
  });

  it("returns 401 when Bearer token is missing (empty)", () => {
    const headers = new Headers();
    headers.set("authorization", "Bearer ");
    const req = new Request("http://localhost", { headers });
    const res = requireAdmin(req, { partyToken: "party-1" });
    expect(res!.status).toBe(401);
  });

  it("succeeds with matching party token", () => {
    const res = requireAdmin(makeRequest("party-1"), { partyToken: "party-1" });
    expect(res).toBeNull();
  });

  it("succeeds with party token when ADMIN_API_TOKEN is unset (not 503)", () => {
    delete process.env.ADMIN_API_TOKEN;
    const res = requireAdmin(makeRequest("my-party-token"), { partyToken: "my-party-token" });
    expect(res).toBeNull();
  });

  it("returns 401 when party token does not match", () => {
    const res = requireAdmin(makeRequest("also-wrong"), { partyToken: "wrong-party" });
    expect(res!.status).toBe(401);
  });

  it("rejects party token with different length", () => {
    const res = requireAdmin(makeRequest("short"), { partyToken: "longer-partypass" });
    expect(res!.status).toBe(401);
  });

  it("treats empty-string partyToken as not provided", () => {
    const res = requireAdmin(makeRequest("anything"), { partyToken: "" });
    expect(res!.status).toBe(401);
  });

  it("does not grant access when ADMIN_API_TOKEN is presented", () => {
    process.env.ADMIN_API_TOKEN = "legacy-global";
    const res = requireAdmin(makeRequest("legacy-global"), { partyToken: "party-1" });
    expect(res!.status).toBe(401);
  });

  it("does not grant access when ADMIN_API_TOKEN matches and no party token is set", () => {
    process.env.ADMIN_API_TOKEN = "legacy-global";
    const res = requireAdmin(makeRequest("legacy-global"), { partyToken: undefined });
    expect(res!.status).toBe(401);
  });
});

describe("readBearerToken", () => {
  it("returns the token from a Bearer header", () => {
    expect(readBearerToken(makeRequest("abc"))).toBe("abc");
  });

  it("rejects a Bearer header containing extra credential material", () => {
    const headers = new Headers();
    headers.set("authorization", "Bearer abc trailing");
    expect(readBearerToken(new Request("http://localhost", { headers }))).toBeNull();
  });

  it("returns null without a Bearer token", () => {
    expect(readBearerToken(makeRequest(null))).toBeNull();
  });
});
