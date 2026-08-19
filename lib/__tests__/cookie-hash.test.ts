import { describe, expect, it } from "vitest";
import { constantTimeEqual, sha256hex } from "@/lib/cookie-hash";
import { adminCookieValue } from "@/lib/admin-cookie-auth";
import { authCookieValue } from "@/lib/auth";
import { hostCookieValue } from "@/lib/host-auth";

describe("sha256hex", () => {
  it("is deterministic and hex-encoded", async () => {
    const a = await sha256hex("bp-v2:1:secret");
    const b = await sha256hex("bp-v2:1:secret");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when the input changes", async () => {
    expect(await sha256hex("bp-v2:1:secret")).not.toBe(await sha256hex("bp-v2:1:other"));
  });
});

describe("constantTimeEqual", () => {
  it("is true only for identical strings", () => {
    expect(constantTimeEqual("aa", "aa")).toBe(true);
    expect(constantTimeEqual("aa", "ab")).toBe(false);
    expect(constantTimeEqual("aa", "aaa")).toBe(false);
  });
});

describe("cookie namespaces", () => {
  it("guest, host, and admin hashes do not collide for the same secret", async () => {
    const guest = await authCookieValue(1, "shared-secret");
    const host = await hostCookieValue(1, "shared-secret");
    const admin = await adminCookieValue("shared-secret");
    expect(new Set([guest, host, admin]).size).toBe(3);
  });
});
