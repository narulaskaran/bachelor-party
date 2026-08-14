import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AUTH_COOKIE, authCookieValue } from "@/lib/auth";
import { getDb } from "@/lib/db";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
    set: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: function MockLink({
    children,
    href,
    ...props
  }: {
    children?: ReactNode;
    href: string;
    className?: string;
  }) {
    return createElement("a", { href, ...props }, children);
  },
}));

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "--font-mock" });
  return { Geist: font, Geist_Mono: font };
});

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => null,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () =>
    createElement("button", { type: "button", "aria-label": "Toggle theme" }),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

vi.mock("@/components/party-view", () => ({
  PartyView: () => "PRIVATE_TRIP_VIEW",
}));

vi.mock("@/app/globals.css", () => ({}));

import { cookies } from "next/headers";
import Page from "@/app/page";
import RootLayout from "@/app/layout";
import TripLayout from "@/app/[slug]/layout";

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

const TRIP_NAME = "Secret Roster Weekend";
const DATE_LABEL = "Sep 5-7, 2026";
const SCHEDULE_TITLE = "Private keg stand briefing";
const LODGE_NAME = "Hidden Cabin Lodge";
const PASSWORD = "group-chat-secret";

const partyRow = {
  id: 42,
  slug: "qa-tester-e2e",
  password: PASSWORD,
  content: {
    kind: "trip",
    trip: {
      siteName: TRIP_NAME,
      tagline: "Don't put this on the marketing page",
      dateLabel: DATE_LABEL,
    },
    lodging: { name: LODGE_NAME, address: "123 Secret Trail" },
    schedule: [
      {
        key: "saturday",
        date: "2026-09-05",
        weekday: "Saturday",
        label: "Main day",
        timed: true,
        entries: [{ title: SCHEDULE_TITLE, time: "7:00 PM" }],
      },
    ],
  },
};

describe("GET /", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
    vi.mocked(cookies).mockReset();
  });

  it("with an access cookie still renders the marketing landing, not the private trip", async () => {
    const cookie = await authCookieValue(42, PASSWORD);
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === AUTH_COOKIE ? { name: AUTH_COOKIE, value: cookie } : undefined,
      set: vi.fn(),
    } as never);
    vi.mocked(getDb).mockReturnValue(fakeDb([partyRow]) as never);

    const html = renderToStaticMarkup(await Page());

    expect(html).toContain("The Big Send");
    expect(html).toContain("Enter your trip");
    expect(html).toContain("Try a sample");
    expect(html).toContain("Create a trip");
    expect(html).toContain('href="#create"');
    expect(html).not.toContain("ADMIN_UI_PASSWORD");
    expect(html).not.toContain('href="/admin"');
    expect(html).not.toContain("PRIVATE_TRIP_VIEW");
    expect(html).not.toContain(TRIP_NAME);
    expect(html).not.toContain(SCHEDULE_TITLE);
    expect(html).not.toContain(LODGE_NAME);
  });

  it("root layout chrome stays marketing when a leftover access cookie is set", async () => {
    const cookie = await authCookieValue(42, PASSWORD);
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === AUTH_COOKIE ? { name: AUTH_COOKIE, value: cookie } : undefined,
      set: vi.fn(),
    } as never);
    vi.mocked(getDb).mockReturnValue(fakeDb([partyRow]) as never);

    const html = renderToStaticMarkup(
      RootLayout({ children: createElement("p", null, "LANDING_BODY") }),
    );

    expect(html).toContain("The Big Send");
    expect(html).toContain("LANDING_BODY");
    expect(html).toContain('id="site-nav-marketing"');
    expect(html).toContain("Create a trip");
    expect(html).toContain('href="/#create"');
    expect(html).not.toContain(TRIP_NAME);
    expect(html).not.toContain(DATE_LABEL);
    expect(html).not.toContain("/qa-tester-e2e#schedule");
    expect(html).not.toContain("/qa-tester-e2e#activities");
  });
});

describe("GET /{slug} chrome", () => {
  afterEach(() => {
    vi.mocked(getDb).mockReset();
    vi.mocked(cookies).mockReset();
  });

  it("still brands the nav with the unlocked trip", async () => {
    const cookie = await authCookieValue(42, PASSWORD);
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === AUTH_COOKIE ? { name: AUTH_COOKIE, value: cookie } : undefined,
      set: vi.fn(),
    } as never);
    vi.mocked(getDb).mockReturnValue(fakeDb([partyRow]) as never);

    const html = renderToStaticMarkup(
      await TripLayout({ children: createElement("p", null, "TRIP_BODY") }),
    );

    expect(html).toContain(TRIP_NAME);
    expect(html).toContain(DATE_LABEL);
    expect(html).toContain("/qa-tester-e2e#schedule");
    expect(html).toContain("TRIP_BODY");
    expect(html).toContain("data-trip-chrome");
    expect(html).not.toContain("Create a trip");
  });
});
