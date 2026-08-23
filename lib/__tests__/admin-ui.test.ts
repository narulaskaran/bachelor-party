import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ADMIN_LOGIN_ERROR,
  ADMIN_UI_UNAVAILABLE_HEADING,
  adminPasswordMatches,
  getAdminUiPassword,
  logAdminUiUnconfigured,
} from "@/lib/admin-ui";
import { AdminUnavailable } from "@/app/admin/admin-unavailable";

const ENV_KEYS = ["ADMIN_UI_PASSWORD", "ADMIN_API_TOKEN"] as const;

describe("admin UI public copy", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] !== undefined) {
        process.env[key] = saved[key];
      } else {
        delete process.env[key];
      }
    }
    vi.restoreAllMocks();
  });

  it("does not put env-var names in public heading or login error copy", () => {
    expect(ADMIN_UI_UNAVAILABLE_HEADING).not.toContain("ADMIN_UI_PASSWORD");
    expect(ADMIN_UI_UNAVAILABLE_HEADING).not.toContain("ADMIN_API_TOKEN");
    expect(ADMIN_LOGIN_ERROR).not.toContain("ADMIN_UI_PASSWORD");
    expect(ADMIN_LOGIN_ERROR).not.toContain("ADMIN_API_TOKEN");
    expect(ADMIN_UI_UNAVAILABLE_HEADING).toMatch(/admin isn't available/i);
  });

  it("renders a public unavailable page without env-var names", () => {
    const html = renderToStaticMarkup(createElement(AdminUnavailable));
    expect(html).not.toContain("ADMIN_UI_PASSWORD");
    expect(html).not.toContain("ADMIN_API_TOKEN");
    expect(html).toContain("Admin isn");
    expect(html).toContain("t available");
  });

  it("treats a missing or empty ADMIN_UI_PASSWORD as unconfigured", () => {
    delete process.env.ADMIN_UI_PASSWORD;
    expect(getAdminUiPassword()).toBeUndefined();
    process.env.ADMIN_UI_PASSWORD = "";
    expect(getAdminUiPassword()).toBeUndefined();
    process.env.ADMIN_UI_PASSWORD = "secret";
    expect(getAdminUiPassword()).toBe("secret");
  });

  it("logs the env key for operators, not for visitors", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logAdminUiUnconfigured();
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0]?.[0])).toContain("ADMIN_UI_PASSWORD");
  });
});

describe("admin UI password compare", () => {
  it("accepts the exact password and rejects wrong ones", () => {
    expect(adminPasswordMatches("secret", "secret")).toBe(true);
    expect(adminPasswordMatches("wrong", "secret")).toBe(false);
    expect(adminPasswordMatches("secre", "secret")).toBe(false);
    expect(adminPasswordMatches("secrets", "secret")).toBe(false);
    expect(adminPasswordMatches("", "secret")).toBe(false);
  });

  it("uses constantTimeEqual, not a plain string compare (timing parity with guest/host paths)", async () => {
    // Same helper the guest password and host adminToken compares use.
    const { constantTimeEqual } = await import("@/lib/cookie-hash");
    const attempt = "secret";
    const expected = "secret";
    expect(adminPasswordMatches(attempt, expected)).toBe(
      constantTimeEqual(attempt, expected),
    );
    expect(adminPasswordMatches("nope", expected)).toBe(
      constantTimeEqual("nope", expected),
    );
  });
});
