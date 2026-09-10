import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RsvpSectionView } from "@/components/sections/rsvp-view";

describe("RsvpSectionView roster", () => {
  it("separates guest name from attendance in the accessible name", () => {
    const html = renderToStaticMarkup(
      createElement(RsvpSectionView, {
        preview: true,
        pollActivities: [],
        extras: { flights: false, food: false, votes: false, notes: false },
        guests: [{ id: 1, name: "Muse", attendanceStatus: "attending" }],
      }),
    );
    expect(html).toContain('aria-label="Muse, Yes"');
    expect(html).toContain(" · Yes");
    expect(html).not.toMatch(/MuseYes/);
  });
});
