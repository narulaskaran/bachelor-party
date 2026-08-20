/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SiteNav } from "@/components/site-nav";
import type { VisibleSections } from "@/lib/trip-sections";

const pageOrder = ["RSVP", "At a glance", "Do your part", "Schedule", "Activities", "Lodge", "Pack"];

const allVisible: VisibleSections = {
  glance: true,
  actionItems: true,
  schedule: true,
  activities: true,
  lodging: true,
  packing: true,
  rsvp: true,
};

describe("SiteNav", () => {
  afterEach(() => cleanup());

  it.each([
    [allVisible, pageOrder],
    [
      { ...allVisible, glance: false, schedule: false, lodging: false },
      ["RSVP", "Do your part", "Activities", "Pack"],
    ],
  ])("keeps both menus in page order while filtering hidden sections", (sections, expected) => {
    const { container } = render(
      <SiteNav siteName="Alpine Weekend" sections={sections} />,
    );

    const menus = container.querySelectorAll('nav[aria-label="Trip sections"]');
    expect(menus).toHaveLength(2);

    for (const menu of menus) {
      expect([...menu.querySelectorAll("a")].map((link) => link.textContent?.trim())).toEqual(
        expected,
      );
    }
  });

  it("puts Try Demo on the left of marketing chrome, mirroring the theme toggle", () => {
    const { container } = render(<SiteNav />);
    const header = container.querySelector("#site-nav-marketing");
    const demo = screen.getByRole("link", { name: /^try demo$/i });
    const toggle = screen.getByRole("button", { name: /toggle theme/i });

    expect(demo.getAttribute("href")).toBe("/demo");
    expect(demo.closest("[data-slot=button]")?.getAttribute("data-variant")).toBe("ghost");
    expect(header?.contains(demo)).toBe(true);
    expect(header?.contains(toggle)).toBe(true);
    expect(header?.innerHTML.indexOf("Try Demo")).toBeLessThan(
      header!.innerHTML.indexOf('aria-label="Toggle theme"'),
    );
    expect(screen.queryByRole("link", { name: /^try a sample$/i })).toBeNull();
  });

  it("does not offer Try Demo on trip chrome", () => {
    render(<SiteNav siteName="Alpine Weekend" sections={allVisible} />);

    expect(screen.queryByRole("link", { name: /^try demo$/i })).toBeNull();
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeTruthy();
  });

  it("separates the event title from the date in guest nav", () => {
    const { container } = render(
      <SiteNav siteName="Friday drinks" dateLabel="Sep 4, 2026" sections={allVisible} />,
    );
    const brand = container.querySelector("a.truncate") ?? screen.getByText(/friday drinks/i);
    expect(brand.textContent).toMatch(/Friday drinks\s+·\s+Sep 4, 2026/);
    expect(brand.textContent).not.toMatch(/drinksSep/);
  });
});
