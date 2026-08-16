import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivitiesSection } from "@/components/sections/activities";
import { ActionItems } from "@/components/sections/action-items";
import { Glance } from "@/components/sections/glance";
import { Hero } from "@/components/sections/hero";
import { ScheduleSection } from "@/components/sections/schedule";
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

  it("lets hero coordinates wrap", () => {
    const trip = {
      siteName: "X",
      coordinates: "39.0000° N, 106.0000° W",
      dateLabel: "Aug 30 – Sep 2, 2030",
    };
    const html = renderToStaticMarkup(
      createElement(Hero, { trip, meta: heroMeta(trip) }),
    );
    expect(html).toContain("break-words");
    expect(html).toContain("39.0000");
  });

  it("uses plain language when schedule times are still loose", () => {
    const html = renderToStaticMarkup(
      createElement(ScheduleSection, {
        schedule: [
          {
            key: "saturday",
            date: "2026-09-05",
            weekday: "Saturday",
            label: "Main day",
            timed: false,
            entries: [{ title: "Hike" }],
          },
        ],
      }),
    );
    expect(html).toContain("Order is set — times may slip.");
    expect(html).not.toContain("Order locked, times loose");
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
    expect(html).toContain("sr-only");
    expect(html).toContain('type="radio"');
    expect(html).toContain("has-[:focus-visible]:ring-3");
    expect(html).not.toContain("opacity-0");
    expect(html).not.toContain("absolute inset-0");
    expect(html).toContain("<label");
  });

  it("labels action-item buttons from the in-page target", () => {
    const html = renderToStaticMarkup(
      createElement(ActionItems, {
        actionItems: [
          { title: "RSVP below", anchor: "#rsvp" },
          { title: "See the plan", anchor: "#schedule" },
          { title: "Cabin details", anchor: "#lodge" },
        ],
      }),
    );
    expect(html).toContain('href="#rsvp"');
    expect(html).toContain(">RSVP<");
    expect(html).toContain('href="#schedule"');
    expect(html).toContain(">Schedule<");
    expect(html).toContain('href="#lodge"');
    expect(html).toContain(">Lodge<");
    expect(html).not.toContain("Go to your info");
  });
});
