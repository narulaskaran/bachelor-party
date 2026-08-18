/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { SiteNav } from "@/components/site-nav";
import type { VisibleSections } from "@/lib/trip-sections";

const pageOrder = ["At a glance", "Do your part", "Schedule", "Activities", "Lodge", "Pack", "RSVP"];

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
      ["Do your part", "Activities", "Pack", "RSVP"],
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
});
