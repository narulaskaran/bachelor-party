import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivitiesSection } from "@/components/sections/activities";
import { ActionItems } from "@/components/sections/action-items";
import { Glance } from "@/components/sections/glance";
import { Hero } from "@/components/sections/hero";
import { ScheduleSection } from "@/components/sections/schedule";
import { VoteActivityGroup } from "@/components/vote-activity-group";
import { BasecampSection } from "@/components/sections/basecamp";
import { heroMeta } from "@/lib/trip-sections";
import { formatGuestWhen } from "@/lib/guest-when";
import { kickerClass } from "@/lib/type";

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

  it("uses the same When line on host preview and the published guest hero", () => {
    const trip = {
      siteName: "Friday drinks",
      startDate: "2026-09-04",
      startTime: "7:00 PM",
      location: "The Dead Rabbit, NYC",
    };
    const html = renderToStaticMarkup(createElement(Hero, { trip }));
    expect(html).toContain("Fri, Sep 4 · time TBD");
    expect(html).not.toContain("7:00 PM");
    expect(html).not.toContain("timezone TBD");
    expect(formatGuestWhen(trip)).toBe("Fri, Sep 4 · time TBD");
  });

  it("shows hero Where from address or maps without inventing a place name", () => {
    const addressOnly = renderToStaticMarkup(
      createElement(Hero, {
        trip: { siteName: "Dinner", address: "123 Main St" },
      }),
    );
    expect(addressOnly).toContain("123 Main St");
    expect(addressOnly).toContain("Dinner");
    expect(addressOnly).not.toContain("Rita");

    const mapsOnly = renderToStaticMarkup(
      createElement(Hero, {
        trip: { siteName: "Dinner", mapsUrl: "https://maps.example.com/venue" },
      }),
    );
    expect(mapsOnly).toContain("Map");
    expect(mapsOnly).toContain("https://maps.example.com/venue");
    expect(mapsOnly).not.toContain("Rita");
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
    expect(html).toContain("text-sm text-muted-foreground");
    expect(html).not.toMatch(/text-xs text-muted-foreground[\s\S]*Order is set/);
    expect(html).not.toContain("Order locked, times loose");
  });

  it("keeps guest-readable meta at text-sm and never quieter than muted-foreground", () => {
    expect(kickerClass).toBe("text-sm text-muted-foreground");
    expect(kickerClass).not.toContain("text-xs");

    const glance = renderToStaticMarkup(
      createElement(Glance, {
        trip: {
          siteName: "X",
          dateLabel: "Sep 4–7",
          location: "Alpine Meadows, CO",
          airport: "DEN",
        },
        lodging: {
          name: "Lodge",
          bedrooms: 4,
          beds: 8,
          bathrooms: 3,
          totalCost: "$2,400.00",
        },
      }),
    );
    expect(glance).toContain("When");
    expect(glance).toContain("Fly into DEN");
    expect(glance).not.toMatch(/text-xs/);
    expect(glance).not.toContain("text-muted-foreground/80");

    const activities = renderToStaticMarkup(
      createElement(ActivitiesSection, {
        activities: {
          core: [],
          ifTimeAllows: [],
          backups: [
            { slug: "hike", name: "Backup hike", description: "If the trail is closed" },
          ],
        },
      }),
    );
    expect(activities).toContain("If the trail is closed");
    expect(activities).toContain("Backups");
    expect(activities).not.toContain("text-muted-foreground/80");
    expect(activities).toContain("text-sm text-muted-foreground");

    const lodge = renderToStaticMarkup(
      createElement(BasecampSection, {
        trip: { siteName: "X", location: "CO" },
        lodging: {
          name: "Pinewood Lodge",
          bedrooms: 4,
          beds: 8,
          bathrooms: 3,
          totalCost: "$100",
          address: "1 Lodge Rd",
        },
      }),
    );
    expect(lodge).toContain("Bedrooms");
    expect(lodge).toContain("Address");
    expect(lodge).not.toMatch(/text-xs text-muted-foreground/);

    const schedule = renderToStaticMarkup(
      createElement(ScheduleSection, {
        schedule: [
          {
            key: "saturday",
            date: "2026-09-05",
            weekday: "Saturday",
            label: "Main day",
            timed: false,
            entries: [{ title: "Hike", note: "Bring layers" }],
          },
        ],
      }),
    );
    expect(schedule).toContain("sticky top-[3.75rem]");
    expect(schedule).not.toContain("sticky top-14");
    expect(schedule).toContain("w-14 shrink-0 break-words font-mono text-sm sm:w-20");
    expect(schedule).toContain("Bring layers");
    expect(schedule).toContain("Order is set — times may slip.");
    expect(schedule).not.toContain("text-muted-foreground/80");
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
          { title: "Pack the list", anchor: "#pack" },
        ],
      }),
    );
    expect(html).toContain('href="#rsvp"');
    expect(html).toContain(">RSVP<");
    expect(html).toContain('href="#schedule"');
    expect(html).toContain(">Schedule<");
    expect(html).toContain('href="#lodge"');
    expect(html).toContain(">Lodge<");
    expect(html).toContain('href="#pack"');
    expect(html).toContain(">Pack<");
    expect(html).not.toContain("Go to your info");
  });
});
