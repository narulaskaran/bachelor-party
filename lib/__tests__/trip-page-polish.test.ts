import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivitiesSection } from "@/components/sections/activities";
import { Glance } from "@/components/sections/glance";
import { Hero } from "@/components/sections/hero";
import { VoteActivityGroup } from "@/components/vote-activity-group";
import { heroMeta } from "@/lib/trip-sections";

describe("trip page polish", () => {
  it("does not render an orphan THE MENU eyebrow when activities are empty", () => {
    const html = renderToStaticMarkup(
      createElement(ActivitiesSection, {
        activities: { core: [], ifTimeAllows: [], backups: [] },
      }),
    );
    expect(html).toBe("");
    expect(html).not.toMatch(/the menu/i);
  });

  it("does not reserve a 4-column glance grid (blank meta slots) for two facts", () => {
    const html = renderToStaticMarkup(
      createElement(Glance, {
        trip: { siteName: "X", dateLabel: "Sep 4–7", location: "Jackson, WY" },
      }),
    );
    expect(html).toContain("Sep 4–7");
    expect(html).toContain("Jackson, WY");
    expect(html).not.toContain("lg:grid-cols-4");
    expect(html).not.toContain("grid-cols-4");
  });

  it("does not render stray hero dividers for missing coordinates and elevation", () => {
    const trip = { siteName: "X", dateLabel: "Sep 4–7", coordinates: "  ", elevation: "" };
    const html = renderToStaticMarkup(
      createElement(Hero, { trip, meta: heroMeta(trip) }),
    );
    expect(html).toContain("Sep 4–7");
    expect(html).not.toContain(" · ");
    expect((html.match(/aria-hidden="true"/g) ?? []).length).toBe(0);
  });

  it("uses a quiet sentence-case title instead of poster display type", () => {
    const html = renderToStaticMarkup(
      createElement(Hero, {
        trip: { siteName: "Cabin weekend" },
        meta: heroMeta({ siteName: "Cabin weekend" }),
      }),
    );
    expect(html).toContain("Cabin weekend");
    expect(html).toContain("tracking-tight");
    expect(html).not.toContain("text-7xl");
    expect(html).not.toContain("uppercase tracking-wide");
    expect(html).not.toContain("Group Trip");
  });

  it("exposes RSVP vote groups as a labeled radiogroup with clickable pills", () => {
    const html = renderToStaticMarkup(
      createElement(VoteActivityGroup, {
        activity: { slug: "bonus", name: "Bonus round" },
      }),
    );
    expect(html).toContain("role=\"radiogroup\"");
    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend");
    expect(html).toContain("Bonus round");
    expect(html).not.toContain("sr-only");
    expect(html).toContain('type="radio"');
    expect(html).toContain("absolute inset-0");
    expect(html).toContain("<label");
  });
});
