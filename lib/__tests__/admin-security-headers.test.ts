import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import nextConfig from "../../next.config";
import { config as proxyConfig, GUEST_PATH_MATCHER, proxy } from "../../proxy";
import {
  ADMIN_HTML_HEADER_SOURCE,
  adminHtmlHeaderRules,
  adminHtmlSecurityHeadersFor,
  isAdminHtmlPath,
} from "@/lib/admin-security-headers";

function headerMap(headers: Headers | { key: string; value: string }[]): Record<string, string> {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return Object.fromEntries(headers.map((h) => [h.key.toLowerCase(), h.value]));
}

describe("isAdminHtmlPath", () => {
  it("matches the admin login and dashboard", () => {
    expect(isAdminHtmlPath("/admin")).toBe(true);
    expect(isAdminHtmlPath("/admin/login")).toBe(true);
    expect(isAdminHtmlPath("/admin/login/")).toBe(true);
  });

  it("does not match public or API surfaces", () => {
    expect(isAdminHtmlPath("/")).toBe(false);
    expect(isAdminHtmlPath("/jackson-hole-26")).toBe(false);
    expect(isAdminHtmlPath("/api/admin/trips")).toBe(false);
    expect(isAdminHtmlPath("/administration")).toBe(false);
  });
});

describe("adminHtmlSecurityHeadersFor", () => {
  // Route-handler / middleware style: given a Request, assert response headers.
  // On a deploy: curl -sI https://<host>/admin/login

  it("sets clickjacking, nosniff, and CSP on /admin/login", () => {
    const headers = adminHtmlSecurityHeadersFor(
      new Request("http://localhost/admin/login"),
    );
    expect(headers).not.toBeNull();
    const h = headerMap(headers!);
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["content-security-policy"]).toMatch(/frame-ancestors 'none'/);
    expect(h["content-security-policy"]).toMatch(/form-action 'self'/);
  });

  it("sets the same headers on the protected admin dashboard", () => {
    const headers = adminHtmlSecurityHeadersFor(new Request("http://localhost/admin"));
    expect(headers?.get("X-Frame-Options")).toBe("DENY");
    expect(headers?.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("does not attach them to public marketing or trip pages", () => {
    expect(adminHtmlSecurityHeadersFor(new Request("http://localhost/"))).toBeNull();
    expect(
      adminHtmlSecurityHeadersFor(new Request("http://localhost/jackson-hole-26")),
    ).toBeNull();
    expect(
      adminHtmlSecurityHeadersFor(new Request("http://localhost/api/admin/trips")),
    ).toBeNull();
  });
});

describe("proxy (admin HTML matcher)", () => {
  it("sets clickjacking, nosniff, and CSP on /admin/login", async () => {
    const res = await proxy(new NextRequest("http://localhost/admin/login"));
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Content-Security-Policy")).toMatch(
      /frame-ancestors 'none'/,
    );
  });

  it("does not set those headers on public pages", async () => {
    const res = await proxy(new NextRequest("http://localhost/"));
    expect(res.headers.get("X-Frame-Options")).toBeNull();
    expect(res.headers.get("X-Content-Type-Options")).toBeNull();
    expect(res.headers.get("Content-Security-Policy")).toBeNull();
  });

  it("matches admin HTML and guest slugs", () => {
    expect(proxyConfig.matcher).toEqual([
      "/admin",
      "/admin/:path*",
      GUEST_PATH_MATCHER,
    ]);
  });

  it("rewrites unknown guest slugs to an unmatched path (HTTP 404), not /_not-found", async () => {
    const res = await proxy(new NextRequest("http://localhost/foo"));
    const rewritten = res.headers.get("x-middleware-rewrite");
    expect(rewritten).toMatch(/\/_not-found\/guest$/);
    expect(rewritten).not.toMatch(/\/_not-found$/);
  });

  it("does not rewrite /demo or home", async () => {
    const demo = await proxy(new NextRequest("http://localhost/demo"));
    expect(demo.headers.get("x-middleware-rewrite")).toBeNull();
    const home = await proxy(new NextRequest("http://localhost/"));
    expect(home.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("308s the old Vercel production alias to party.narula.xyz with path and query", async () => {
    const res = await proxy(
      new NextRequest("https://bachelor-party-eight.vercel.app/demo?from=bookmark"),
    );
    expect(res.status).toBe(308);
    expect(res.headers.get("Location")).toBe(
      "https://party.narula.xyz/demo?from=bookmark",
    );
  });

  it("does not redirect localhost or Vercel preview deployments", async () => {
    const local = await proxy(new NextRequest("http://localhost:3000/"));
    expect(local.status).not.toBe(308);
    expect(local.headers.get("Location")).toBeNull();

    const preview = await proxy(
      new NextRequest("https://bachelor-party-eight-git-feat-acme.vercel.app/"),
    );
    expect(preview.status).not.toBe(308);
    expect(preview.headers.get("Location")).toBeNull();
  });
});

describe("next.config headers()", () => {
  it("applies the admin HTML rules only on /admin/:path*", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    const rules = await nextConfig.headers!();
    expect(rules).toEqual(adminHtmlHeaderRules());
    expect(rules.map((r) => r.source)).toEqual([ADMIN_HTML_HEADER_SOURCE]);

    const h = headerMap(rules[0].headers);
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["content-security-policy"]).toMatch(/frame-ancestors 'none'/);
  });
});
