/** Unknown /:slug must 404 with branded copy, not Next's __next_error__ fallback. */

import { describe, it, expect, afterEach, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement, type ReactNode } from "react";
import { NextRequest } from "next/server";
import {
  getAccessFallbackHTTPStatus,
  isHTTPAccessFallbackError,
} from "next/dist/client/components/http-access-fallback/http-access-fallback";
import { tryToParsePath } from "next/dist/lib/try-to-parse-path";
import { getDb } from "@/lib/db";
import { MISSING_GUEST_REWRITE } from "@/lib/party-exists";
import { TripNotFound } from "@/components/trip-not-found";
import RootNotFound from "@/app/not-found";
import SlugNotFound from "@/app/[slug]/not-found";
import Page from "@/app/[slug]/page";
import { config as proxyConfig, proxy } from "@/proxy";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("@/components/party-view", () => ({
  PartyView: ({ sample }: { sample?: boolean }) =>
    sample ? "DEMO_TRIP_SAMPLE" : "LIVE_TRIP",
}));

function fakeDb(rows: Record<string, unknown>[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  };
}

function branded404Html(node: ReactElement) {
  return renderToStaticMarkup(node);
}

/** True when Next would invoke `proxy` for this pathname (`config.matcher`). */
function proxyMatcherHits(pathname: string): boolean {
  return proxyConfig.matcher.some((source) => {
    const { regexStr, error } = tryToParsePath(source);
    if (error || !regexStr) {
      throw error ?? new Error(`invalid matcher ${source}`);
    }
    return new RegExp(regexStr).test(pathname);
  });
}

async function pageHttpStatus(
  slug: string,
): Promise<{ status: number; html?: string }> {
  try {
    const node = await Page({ params: Promise.resolve({ slug }) });
    return { status: 200, html: branded404Html(node as ReactElement) };
  } catch (error) {
    if (!isHTTPAccessFallbackError(error)) throw error;
    return { status: getAccessFallbackHTTPStatus(error) };
  }
}

describe("unknown guest slug 404", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("renders branded copy and a home link, not the Next.js error fallback", () => {
    const html = branded404Html(createElement(TripNotFound));
    expect(html).toContain("No trip at this link");
    expect(html).toContain("The Big Send");
    expect(html).toContain("Back home");
    expect(html).toContain('href="/"');
    expect(html).not.toContain("__next_error__");
    expect(html).not.toContain("This page could not be found");
  });

  it("root and slug not-found routes serve the same branded page", () => {
    const root = branded404Html(createElement(RootNotFound));
    const slug = branded404Html(createElement(SlugNotFound));
    expect(root).toContain("No trip at this link");
    expect(slug).toContain("No trip at this link");
    expect(root).not.toContain("__next_error__");
    expect(slug).not.toContain("__next_error__");
  });

  it("proxy rewrites a missing slug to the unmatched 404 path, not /_not-found", async () => {
    vi.mocked(getDb).mockReturnValue(null);
    const res = await proxy(new NextRequest("http://localhost/foo"));
    const rewritten = new URL(res.headers.get("x-middleware-rewrite") ?? "");
    expect(rewritten.pathname).toBe(MISSING_GUEST_REWRITE);
    expect(rewritten.pathname.split("/").filter(Boolean).length).toBeGreaterThan(1);
  });

  it("missing slug page render is HTTP 404 via notFound(), not 200 branded HTML", async () => {
    vi.mocked(getDb).mockReturnValue(null);

    const { status, html } = await pageHttpStatus("foo");
    expect(status).toBe(404);
    expect(html).toBeUndefined();
  });

  it("missing slug with an empty database lookup responds 404", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb([]) as never);

    const { status, html } = await pageHttpStatus("no-such-trip");
    expect(status).toBe(404);
    expect(html).toBeUndefined();
  });

  it("/demo stays 200 with trip content and is not rewritten", async () => {
    vi.mocked(getDb).mockReturnValue(null);

    const { status, html } = await pageHttpStatus("demo");
    expect(status).toBe(200);
    expect(html).toContain("DEMO_TRIP_SAMPLE");

    const res = await proxy(new NextRequest("http://localhost/demo"));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("an existing trip stays 200 (login gate, not 404) and is not rewritten", async () => {
    vi.mocked(getDb).mockReturnValue(
      fakeDb([
        {
          id: 1,
          password: "crew-secret",
          content: { kind: "trip", trip: { siteName: "Jackson Hole '26" } },
        },
      ]) as never,
    );

    const { status, html } = await pageHttpStatus("jackson-hole-26");
    expect(status).toBe(200);
    expect(html).toContain("Who goes there");
    expect(html).not.toContain("No trip at this link");

    const res = await proxy(new NextRequest("http://localhost/jackson-hole-26"));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("matcher includes admin-* and api-* slugs, not only exact /admin and /api", () => {
    for (const path of [
      "/admin-3",
      "/api-2",
      "/api-foo",
      "/this-does-not-exist-xyzzy",
      "/login",
      "/demo-2",
    ]) {
      expect(proxyMatcherHits(path)).toBe(true);
    }

    expect(proxyMatcherHits("/admin")).toBe(true);
    expect(proxyMatcherHits("/admin/login")).toBe(true);
    expect(proxyMatcherHits("/api")).toBe(true);
    expect(proxyMatcherHits("/api/")).toBe(true);
    expect(proxyMatcherHits("/api/admin/trips")).toBe(false);
    expect(proxyMatcherHits("/api/openapi")).toBe(false);
  });

  it("missing /admin-3 and /api-2 rewrite to the branded 404 path, not __next_error__", async () => {
    vi.mocked(getDb).mockReturnValue(null);

    for (const slug of ["admin-3", "api-2", "api-foo"]) {
      expect(proxyMatcherHits(`/${slug}`)).toBe(true);
      const res = await proxy(new NextRequest(`http://localhost/${slug}`));
      const rewritten = new URL(res.headers.get("x-middleware-rewrite") ?? "");
      expect(rewritten.pathname).toBe(MISSING_GUEST_REWRITE);
    }

    const branded = branded404Html(createElement(RootNotFound));
    expect(branded).toContain("No trip at this link");
    expect(branded).not.toContain("__next_error__");
  });

  it("/admin and /api stay app routes (no guest 404 rewrite)", async () => {
    vi.mocked(getDb).mockReturnValue(null);

    const admin = await proxy(new NextRequest("http://localhost/admin"));
    expect(admin.headers.get("x-middleware-rewrite")).toBeNull();
    expect(admin.headers.get("X-Frame-Options")).toBe("DENY");

    const api = await proxy(new NextRequest("http://localhost/api"));
    expect(api.headers.get("x-middleware-rewrite")).toBeNull();
    expect(api.status).toBe(404);
    expect(api.headers.get("content-type")).toMatch(/application\/json/);
    expect(await api.json()).toEqual({ error: "Not found" });

    const apiSlash = await proxy(new NextRequest("http://localhost/api/"));
    expect(apiSlash.headers.get("x-middleware-rewrite")).toBeNull();
    expect(apiSlash.status).toBe(404);
    expect(await apiSlash.json()).toEqual({ error: "Not found" });

    const apiRoute = await proxy(
      new NextRequest("http://localhost/api/admin/trips"),
    );
    expect(apiRoute.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("an existing leftover trip at admin-2 is not rewritten", async () => {
    vi.mocked(getDb).mockReturnValue(
      fakeDb([
        {
          id: 1,
          password: "crew-secret",
          content: { kind: "trip", trip: { siteName: "Admin leftover" } },
        },
      ]) as never,
    );

    expect(proxyMatcherHits("/admin-2")).toBe(true);
    const res = await proxy(new NextRequest("http://localhost/admin-2"));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();

    const { status, html } = await pageHttpStatus("admin-2");
    expect(status).toBe(200);
    expect(html).toContain("Who goes there");
    expect(html).not.toContain("No trip at this link");
  });
});
