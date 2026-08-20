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
    expect(html).toContain("Lodge");
    expect(html).toContain('href="#lodge"');
    expect(html).toContain("Pack");
    expect(html).toContain('href="#pack"');
    expect(html).not.toContain("#basecamp");
    expect(html).toContain("Alpine Weekend");
    expect(html).not.toContain("The Big Send");
    expect(html).not.toContain("Try Demo");
    expect(html).not.toContain("data-demo-link");
    expect(html).toContain("RSVP");
    expect(html).toContain("Do your part");
    expect(html).toContain("At a glance");
    expect(html).not.toContain("Your Info");
    expect(html).not.toContain("Basecamp");
    expect(html).not.toContain('id="site-nav-marketing"');
    expect(html).toContain("data-trip-chrome");
  });

  it("paints hamburger labels on an opaque panel (no alpha, no transparent parent)", () => {
    const html = renderToStaticMarkup(
      createElement(SiteNav, {
        siteName: DEMO_PARTY.trip.siteName,
        dateLabel: DEMO_PARTY.trip.dateLabel,
        slug: "demo",
        sections: tripSections,
      }),
    );

    const detailsHtml = html.slice(html.indexOf("<details"));
    expect(detailsHtml).toContain("<details");
    expect(detailsHtml).toContain("bg-background");
    expect(detailsHtml).not.toMatch(/bg-background\/\d+/);
    expect(detailsHtml).not.toContain("backdrop-blur");
    expect(detailsHtml).not.toContain("bg-transparent");
    expect(detailsHtml).toContain("md:hidden");
    expect(html).toContain("bg-background/90");
  });

  it("does not render the hamburger on the public landing nav", () => {
    const html = renderToStaticMarkup(createElement(SiteNav));
    expect(html).not.toContain('aria-label="Open menu"');
    expect(html).not.toContain("<details");
    expect(html).toContain('id="site-nav-marketing"');
    expect(html).toContain("data-marketing-brand");
    expect(html).toContain("The Big Send");
    expect(html).toContain("ml-auto");
    expect(html).toContain('aria-label="Toggle theme"');
    expect(html).toContain("Try Demo");
    expect(html).toContain('href="/demo"');
    expect(html).toContain("data-demo-link");
    expect(html.indexOf("Try Demo")).toBeLessThan(html.indexOf('aria-label="Toggle theme"'));
    expect(html).not.toContain("Create a trip");
    expect(html).not.toContain('href="/#create"');
    expect(html).not.toContain('href="/admin"');
  });

  it("omits Pack from trip nav when the packing list is empty", () => {
    const html = renderToStaticMarkup(
      createElement(SiteNav, {
        siteName: "Cabin",
        slug: "cabin",
        sections: visibleSections({ trip: { siteName: "Cabin" } }),
      }),
    );
    expect(html).toContain("RSVP");
    expect(html).not.toContain("#pack");
    expect(html).not.toContain(">Pack<");
  });

  it("keeps trip page shells from forcing a min-content width past ~390px", () => {
    const html = renderToStaticMarkup(createElement(PartyView, { content: DEMO_PARTY }));
    expect(html).toContain("min-w-0");
    expect(html).toContain("w-full");
    expect(html).not.toContain("overflow-x-auto");
    expect(html).toContain('id="glance"');
    expect(html).toContain('id="do-your-part"');
    expect(html).toContain('id="lodge"');
    expect(html).toContain('id="pack"');
    expect(html).toContain('id="rsvp"');
    const lodgeIdx = html.indexOf('id="lodge"');
    const packIdx = html.indexOf('id="pack"');
    const rsvpIdx = html.indexOf('id="rsvp"');
    expect(lodgeIdx).toBeGreaterThan(-1);
    expect(packIdx).toBeGreaterThan(lodgeIdx);
    expect(rsvpIdx).toBeGreaterThan(packIdx);
  });

  it("hides night-out key events when there is no schedule", () => {
    const html = renderToStaticMarkup(
      createElement(PartyView, {
        content: { preset: "night-out", trip: { siteName: "Dinner" } },
      }),
    );
    expect(html).not.toContain("Key events");
    expect(html).not.toContain("Add days and events");
    expect(html).not.toMatch(/API, CLI, or an agent/);
    expect(html).not.toContain('id="schedule"');
  });

  it("hides Pack when the trip has no packing list", () => {
    const html = renderToStaticMarkup(
      createElement(PartyView, { content: { trip: { siteName: "X" } } }),
    );
    expect(html).not.toContain('id="pack"');
    expect(html).not.toContain("Don&#x27;t forget these.");
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
    expect(html).toContain('id="lodge"');
    expect(html).not.toContain('id="basecamp"');
    expect(html).not.toContain("overflow-x-auto");
    expect(html).not.toContain("shrink-0 px-6");
  });

  it("does not link the demo lodge listing at example.com", () => {
    const html = renderToStaticMarkup(
      createElement(BasecampSection, {
        trip: DEMO_PARTY.trip,
        lodging: DEMO_PARTY.lodging!,
      }),
    );
    expect(html).not.toContain("example.com");
    expect(html).not.toContain(">Listing<");
    expect(html).toContain("Open in Maps");
    expect(html).toMatch(/min-h-11/);
    expect(html).toContain("google.com/maps");
    expect(html).toContain("Lodge");
  });

  it("lets a long totalCost wrap instead of nowrap in a 2-col grid", () => {
    const html = renderToStaticMarkup(
      createElement(BasecampSection, {
        trip: { siteName: "X" },
        lodging: { name: "Lodge", totalCost: "$2,400.00" },
      }),
    );
    const costIdx = html.indexOf("$2,400.00");
    expect(costIdx).toBeGreaterThan(-1);
    const pTag = html.slice(html.lastIndexOf("<p", costIdx), costIdx);
    expect(pTag).toContain("break-words");
    expect(pTag).not.toContain("whitespace-nowrap");
  });
});
