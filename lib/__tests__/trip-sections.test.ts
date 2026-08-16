import { describe, it, expect } from "vitest";
import { DEMO_PARTY } from "@/lib/demo-party";
import type { PartyContent } from "@/lib/party-types";
import {
  glanceFacts,
  hasActivities,
  hasLodging,
  heroMeta,
  showFlightFields,
  visibleSections,
} from "@/lib/trip-sections";

const sparse: PartyContent = {
  trip: { siteName: "Jackson Hole '26" },
};

describe("visibleSections", () => {
  it("hides lodging, schedule, activities, and glance when only a name exists", () => {
    expect(visibleSections(sparse)).toEqual({
      glance: false,
      actionItems: false,
      schedule: false,
      activities: false,
      lodging: false,
      rsvp: true,
    });
  });

  it("shows every section on the demo trip", () => {
    expect(visibleSections(DEMO_PARTY)).toEqual({
      glance: true,
      actionItems: true,
      schedule: true,
      activities: true,
      lodging: true,
      rsvp: true,
    });
  });

  it("does not treat empty lodging as present", () => {
    expect(hasLodging({ trip: { siteName: "X" }, lodging: undefined })).toBe(false);
  });

  it("does not treat blank-named activities as present", () => {
    expect(
      hasActivities({
        trip: { siteName: "X" },
        activities: { core: [{ slug: "x", name: "   " }], backups: [] },
      }),
    ).toBe(false);
  });
});

describe("heroMeta", () => {
  it("omits missing coordinates and elevation", () => {
    expect(heroMeta({ siteName: "X", dateLabel: "Sep 4–7" })).toEqual(["Sep 4–7"]);
  });

  it("omits whitespace-only coordinates and elevation", () => {
    expect(
      heroMeta({
        siteName: "X",
        coordinates: "  ",
        elevation: "\n",
        dateLabel: "Sep 4–7",
      }),
    ).toEqual(["Sep 4–7"]);
  });
});

describe("glanceFacts", () => {
  it("does not invent 0BR · 0 beds when lodging is missing", () => {
    expect(glanceFacts({ siteName: "X", dateLabel: "Labor Day" })).toEqual([
      { label: "When", value: "Labor Day" },
    ]);
  });

  it("does not render 0BR · 0 beds when lodging counts are zero", () => {
    const facts = glanceFacts({ siteName: "X" }, { name: "Cabin", bedrooms: 0, beds: 0 });
    expect(facts.some((f) => String(f.value).includes("0BR"))).toBe(false);
    expect(facts.some((f) => String(f.value).includes("0 beds"))).toBe(false);
  });

  it("uses Total instead of Damage for lodging cost", () => {
    const facts = glanceFacts(
      { siteName: "X", location: "Jackson, WY" },
      { name: "Cabin", totalCost: "$2,400.00" },
    );
    expect(facts.some((f) => f.label === "Damage")).toBe(false);
    expect(facts.find((f) => f.label === "Total")?.value).toBe("$2,400.00");
    expect(facts.find((f) => f.label === "Total")?.note).toBe(
      "You'll get a request once we know who's coming.",
    );
  });

  it("estimates a per-person split when bed count is known", () => {
    const facts = glanceFacts(
      { siteName: "X" },
      { name: "Cabin", totalCost: "$2,400.00", beds: 8 },
    );
    expect(facts.find((f) => f.label === "Total")?.note).toBe(
      "About $300 each once everyone's in",
    );
  });
});

describe("showFlightFields", () => {
  it("is false until an airport is set", () => {
    expect(showFlightFields(sparse)).toBe(false);
    expect(showFlightFields(DEMO_PARTY)).toBe(true);
  });
});

describe("legacy groomName", () => {
  it("does not need to be present for a full demo-shaped trip to render sections", () => {
    expect("groomName" in DEMO_PARTY.trip).toBe(false);
    expect(visibleSections(DEMO_PARTY).lodging).toBe(true);
  });
});
