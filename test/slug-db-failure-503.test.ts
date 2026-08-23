/** Transient DB failure on /:slug → real HTTP 503 + Retry-After, branded copy. */

import { describe, it, expect, afterEach, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement, type ReactNode } from "react";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import {
  MISSING_GUEST_REWRITE,
  TRIP_UNAVAILABLE_REWRITE,
} from "@/lib/party-exists";
import {
  TRIP_UNAVAILABLE_HEADING,
  TRIP_UNAVAILABLE_MESSAGE,
  TripUnavailable,
} from "@/components/trip-unavailable";
import { GET as unavailableGET } from "@/app/api/trip-unavailable/route";
import Page from "@/app/[slug]/page";
import { proxy } from "@/proxy";

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

function dbDown() {
  // A configured database whose queries fail (e.g. Neon briefly unreachable).
  vi.mocked(getDb).mockImplementation(() => {
    throw new Error("db unavailable");
  });
}

describe("transient DB failure on a guest slug", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("proxy rewrites the failed slug lookup to the 503 handler, not the page or 404", async () => {
    dbDown();
    const res = await proxy(new NextRequest("http://localhost/jackson-hole-26"));
    const rewritten = new URL(res.headers.get("x-middleware-rewrite") ?? "");
    expect(rewritten.pathname).toBe(TRIP_UNAVAILABLE_REWRITE);
    expect(rewritten.pathname).not.toBe(MISSING_GUEST_REWRITE);
  });

  it("the 503 handler serves status 503 with Retry-After and branded copy", async () => {
    const res = await unavailableGET();
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain(TRIP_UNAVAILABLE_HEADING);
    expect(html).toContain(TRIP_UNAVAILABLE_MESSAGE);
    expect(html).not.toContain("__next_error__");
  });

  it("non-GET requests rewritten during an outage get 503, not a 405", async () => {
    const { POST: unavailablePOST } = await import(
      "@/app/api/trip-unavailable/route"
    );
    const res = await unavailablePOST();
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("page-level fallback still renders branded retry UI if its own lookup fails", async () => {
    dbDown();
    const node = await Page({ params: Promise.resolve({ slug: "jackson-hole-26" }) });
    const html = renderToStaticMarkup(node as ReactElement);
    expect(html).toContain(TRIP_UNAVAILABLE_HEADING);
    expect(html).toContain("Try again in a minute");
  });

  it("TripUnavailable component and 503 handler share the same copy", () => {
    const html = renderToStaticMarkup(createElement(TripUnavailable));
    expect(html).toContain(TRIP_UNAVAILABLE_HEADING);
    expect(html).toContain(TRIP_UNAVAILABLE_MESSAGE);
  });
});
