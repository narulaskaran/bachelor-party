/** Unknown /:slug must 404 with branded copy, not Next's __next_error__ fallback. */

import { describe, it, expect, afterEach, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement, type ReactNode } from "react";
import { getDb } from "@/lib/db";
import { TripNotFound } from "@/components/trip-not-found";
import RootNotFound from "@/app/not-found";
import SlugNotFound from "@/app/[slug]/not-found";
import Page from "@/app/[slug]/page";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

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

  it("missing slug with no database calls notFound (HTTP 404)", async () => {
    const { notFound } = await import("next/navigation");
    vi.mocked(getDb).mockReturnValue(null);

    await expect(Page({ params: Promise.resolve({ slug: "foo" }) })).rejects.toThrow(
      /NEXT_HTTP_ERROR_FALLBACK/,
    );
    expect(notFound).toHaveBeenCalled();
  });

  it("missing slug with an empty database lookup calls notFound", async () => {
    const { notFound } = await import("next/navigation");
    vi.mocked(notFound).mockClear();
    vi.mocked(getDb).mockReturnValue(fakeDb([]) as never);

    await expect(
      Page({ params: Promise.resolve({ slug: "no-such-trip" }) }),
    ).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK/);
    expect(notFound).toHaveBeenCalled();
  });
});
