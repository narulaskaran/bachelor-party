import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEMO_PARTY } from "@/lib/demo-party";
import { heroMeta, visibleSections } from "@/lib/trip-sections";
import { SiteNav } from "@/components/site-nav";
import { PartyView } from "@/components/party-view";
import { BasecampSection } from "@/components/sections/basecamp";
import { Hero } from "@/components/sections/hero";

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

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => createElement("button", { type: "button", "aria-label": "Toggle theme" }),
}));

vi.mock("@/components/sections/rsvp", () => ({
  RsvpSection: () => createElement("section", { id: "rsvp" }),
}));

vi.mock("@/components/countdown", () => ({
  Countdown: () => null,
}));

const tripSections = visibleSections(DEMO_PARTY);

describe("mobile trip layout", () => {
  it("collapses header nav behind a hamburger instead of a nowrap row", () => {
    const html = renderToStaticMarkup(
      createElement(SiteNav, {
        siteName: DEMO_PARTY.trip.siteName,
        dateLabel: DEMO_PARTY.trip.dateLabel,
        slug: "demo",
        sections: tripSections,
      }),
    );

    expect(html).toContain('aria-label="Open menu"');
    expect(html).toContain("<details");
    expect(html).toContain("md:hidden");
    expect(html).toContain("hidden");
    expect(html).toContain("md:flex");
    expect(html).not.toContain("overflow-x-auto");
    expect(html).toContain("Schedule");
    expect(html).toContain("Activities");
    expect(html).toContain("Basecamp");
    expect(html).toContain("Your Info");
    expect(html).not.toContain('id="site-nav-marketing"');
    expect(html).toContain("data-trip-chrome");
  });

  it("does not render the hamburger on the public landing nav", () => {
    const html = renderToStaticMarkup(createElement(SiteNav));
    expect(html).not.toContain('aria-label="Open menu"');
    expect(html).not.toContain("<details");
    expect(html).toContain('id="site-nav-marketing"');
    expect(html).toContain("Create a trip");
    expect(html).toContain('href="/#create"');
    expect(html).not.toContain('href="/admin"');
  });

  it("keeps trip page shells from forcing a min-content width past ~390px", () => {
    const html = renderToStaticMarkup(createElement(PartyView, { content: DEMO_PARTY }));
    expect(html).toContain("min-w-0");
    expect(html).toContain("w-full");
    expect(html).not.toContain("overflow-x-auto");
  });

  it("wraps long hero titles instead of overflowing", () => {
    const html = renderToStaticMarkup(
      createElement(Hero, {
        trip: { siteName: "Supercalifragilisticexpialidocious Send-Off" },
        meta: heroMeta({ siteName: "X" }),
      }),
    );
    expect(html).toContain("break-words");
  });

  it("lays out basecamp stats in a wrapping grid instead of a horizontal scroller", () => {
    const html = renderToStaticMarkup(
      createElement(BasecampSection, {
        trip: DEMO_PARTY.trip,
        lodging: DEMO_PARTY.lodging!,
      }),
    );
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("min-w-0");
    expect(html).not.toContain("overflow-x-auto");
    expect(html).not.toContain("shrink-0 px-6");
  });
});
