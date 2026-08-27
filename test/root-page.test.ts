import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AUTH_COOKIE, authCookieValue } from "@/lib/auth";
import { getDb } from "@/lib/db";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
    set: vi.fn(),
  })),
  headers: vi.fn(async () => ({
    get: () => null,
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

import { cookies, headers } from "next/headers";
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
    vi.mocked(headers).mockReset();
    vi.mocked(headers).mockResolvedValue({
      get: () => null,
    } as never);
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

    expect(html).toMatch(/The Big <span class="text-primary">Send<\/span>/);
    expect(html).toContain("Enter your trip");
    expect(html).not.toContain("Try a sample");
    expect(html).not.toContain("Try Demo");
    expect(html).toContain("Create an event");
    expect(html).toContain("data-landing-page");
    expect(html).toContain('href="#create"');
    expect(html).toContain('href="#enter"');
    expect(html).toContain("I have an invite");
    expect(html).toContain("I&#x27;m hosting");
    expect(html.match(/I&#x27;m hosting/g)).toHaveLength(1);
    expect(html).not.toContain("password-gated");
    expect(html).not.toMatch(/href="#rsvp"/);
    expect(html).not.toContain("ADMIN_UI_PASSWORD");
    expect(html).not.toContain('href="/admin"');
    expect(html).not.toContain("PRIVATE_TRIP_VIEW");
    expect(html).not.toContain(TRIP_NAME);
    expect(html).not.toContain(SCHEDULE_TITLE);
    expect(html).not.toContain(LODGE_NAME);
    expect(html).toContain("party.narula.xyz");
    expect(html).toContain("/g/");
    expect(html).not.toContain("yoursite.com");
    expect(html).toMatch(
      /trip-entry-hint[\s\S]*whitespace-nowrap font-mono[\s\S]*party\.narula\.xyz\/g\//,
    );
    expect(html).not.toMatch(/trip-entry-hint[\s\S]*<wbr\/?>/);
  });

  it("landing invite hint uses the request host so previews stay accurate", async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) =>
        name === "x-forwarded-host" ? "preview.example" : null,
    } as never);
    vi.mocked(getDb).mockReturnValue(fakeDb([]) as never);

    const html = renderToStaticMarkup(await Page());

    expect(html).toContain("preview.example");
    expect(html).toContain("/g/");
    expect(html).not.toContain("yoursite.com");
  });

  it("landing invite hint uses party.narula.xyz when the request is the old Vercel alias", async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) =>
        name === "x-forwarded-host" ? "bachelor-party-eight.vercel.app" : null,
    } as never);
    vi.mocked(getDb).mockReturnValue(fakeDb([]) as never);

    const html = renderToStaticMarkup(await Page());

    expect(html).toContain("party.narula.xyz");
    expect(html).toContain("/g/");
    expect(html).not.toContain("bachelor-party-eight.vercel.app/your-trip");
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
    expect(html).toContain("data-marketing-brand");
    expect(html).not.toContain("Create a trip");
    expect(html).not.toContain('href="/#create"');
    expect(html).not.toContain(TRIP_NAME);
    expect(html).not.toContain(DATE_LABEL);
    expect(html).not.toContain('href="#schedule"');
    expect(html).not.toContain("/qa-tester-e2e#activities");
  });

  it("landing chrome hides the nav wordmark and does not add a second create CTA", async () => {
    vi.mocked(getDb).mockReturnValue(fakeDb([]) as never);

    const html = renderToStaticMarkup(
      RootLayout({ children: await Page() }),
    );

    expect(html).toContain("data-landing-page");
    expect(html).toContain('id="site-nav-marketing"');
    expect(html).toContain("data-marketing-brand");
    expect(html).toContain("data-demo-link");
    expect(html).toContain("Try Demo");
    expect(html).toContain('href="/demo"');
    expect(html).not.toContain("Try a sample");
    expect(html).toContain("I&#x27;m hosting");
    expect(html).toContain('href="#create"');
    expect(html).not.toContain('href="/#create"');
    expect(html).not.toContain("Create a trip</a>");
  });

  it("does not punch a transparent hole in the sticky marketing bar on landing", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    expect(css).not.toContain("backdrop-filter: none");
    expect(css).not.toMatch(
      /#site-nav-marketing \{\s*border-color: transparent;\s*background: transparent;/,
    );
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
      await TripLayout({
        children: createElement("p", null, "TRIP_BODY"),
        params: Promise.resolve({ slug: "qa-tester-e2e" }),
      }),
    );

    expect(html).toContain(TRIP_NAME);
    expect(html).not.toContain("The Big Send");
    expect(html).toContain(DATE_LABEL);
    expect(html).toContain('href="#rsvp"');
    expect(html).toContain("RSVP");
    expect(html).toContain("TRIP_BODY");
    expect(html).toContain("data-trip-chrome");
    expect(html).not.toContain("Create a trip");
    expect(html).not.toContain("Your Info");
  });

  it("points trip chrome home at the minted guest path, not /{slug}", async () => {
    const guestToken = "f".repeat(32);
    const cookie = await authCookieValue(42, PASSWORD);
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === AUTH_COOKIE ? { name: AUTH_COOKIE, value: cookie } : undefined,
      set: vi.fn(),
    } as never);
    vi.mocked(getDb).mockReturnValue(fakeDb([{ ...partyRow, guestToken }]) as never);

    const html = renderToStaticMarkup(
      await TripLayout({
        children: createElement("p", null, "TRIP_BODY"),
        params: Promise.resolve({ slug: "qa-tester-e2e" }),
      }),
    );

    expect(html).toContain(`href="/g/${guestToken}"`);
    expect(html).not.toContain('href="/qa-tester-e2e"');
  });

  it("does not brand another trip's login gate with leftover cookie chrome", async () => {
    const cookie = await authCookieValue(42, PASSWORD);
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === AUTH_COOKIE ? { name: AUTH_COOKIE, value: cookie } : undefined,
      set: vi.fn(),
    } as never);
    vi.mocked(getDb).mockReturnValue(fakeDb([partyRow]) as never);

    const gate = await TripLayout({
      children: createElement("p", null, "Who Goes There"),
      params: Promise.resolve({ slug: "qa-host-create" }),
    });
    const html = renderToStaticMarkup(RootLayout({ children: gate }));

    expect(html).toContain("Who Goes There");
    expect(html).toContain("The Big Send");
    expect(html).toContain('id="site-nav-marketing"');
    expect(html).toContain("data-marketing-brand");
    expect(html).not.toContain("Create a trip");
    expect(html).not.toContain('href="/#create"');
    expect(html).not.toContain(TRIP_NAME);
    expect(html).not.toContain(DATE_LABEL);
    expect(html).not.toContain("data-trip-chrome");
    expect(html).not.toContain('href="#schedule"');
    expect(html).not.toContain("/qa-tester-e2e#activities");
    expect(html).not.toContain("/qa-host-create#schedule");
  });

  it("anonymous locked slug keeps marketing nav only", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
      set: vi.fn(),
    } as never);
    vi.mocked(getDb).mockReturnValue(fakeDb([partyRow]) as never);

    const gate = await TripLayout({
      children: createElement("p", null, "Who Goes There"),
      params: Promise.resolve({ slug: "qa-host-create" }),
    });
    const html = renderToStaticMarkup(RootLayout({ children: gate }));

    expect(html).toContain("Who Goes There");
    expect(html).toContain('id="site-nav-marketing"');
    expect(html).toContain("The Big Send");
    expect(html).not.toContain(TRIP_NAME);
    expect(html).not.toContain('href="#schedule"');
    expect(html).not.toContain("data-trip-chrome");
  });

  it("shows trip in-page nav on /demo without a cookie", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
      set: vi.fn(),
    } as never);
    vi.mocked(getDb).mockReturnValue(fakeDb([]) as never);

    const html = renderToStaticMarkup(
      await TripLayout({
        children: createElement("p", null, "DEMO_BODY"),
        params: Promise.resolve({ slug: "demo" }),
      }),
    );

    expect(html).toContain("Alpine Weekend");
    expect(html).not.toContain("The Big Send");
    expect(html).toContain("data-trip-chrome");
    expect(html).toContain('href="#rsvp"');
    expect(html).toContain("RSVP");
    expect(html).toContain('href="#do-your-part"');
    expect(html).toContain("Do your part");
    expect(html).toContain('href="#glance"');
    expect(html).toContain('href="#lodge"');
    expect(html).not.toContain("#basecamp");
    expect(html).toContain("Lodge");
    expect(html).toContain('href="#pack"');
    expect(html).toContain("Pack");
    expect(html).not.toContain("Your Info");
    expect(html).not.toContain("Create a trip");
    expect(html).not.toContain("Try Demo");
    expect(html).toContain("DEMO_BODY");
  });
});
