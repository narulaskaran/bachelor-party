import { describe, expect, it } from "vitest";
import { draftFactsForContent, ingestEventPlan, reviewComplete, stripDraftReview } from "@/lib/plan-ingestion";

describe("messy event plan ingestion", () => {
  it("rejects empty input as an unreviewed draft with no invented logistics", () => {
    const { content, review } = ingestEventPlan("   ");
    expect(content.trip.siteName).toBe("Untitled event");
    expect(content.trip.startDate).toBeUndefined();
    expect(content.trip.location).toBeUndefined();
    expect(review.acknowledged).toBe(false);
    expect(review.facts.filter((item) => item.status === "missing").map((item) => item.path)).toEqual(
      expect.arrayContaining(["trip.startDate", "trip.location", "lodging.name", "trip.timezone"]),
    );
  });

  it("extracts partial facts and keeps missing logistics visible", () => {
    const { content, review } = ingestEventPlan(
      "Event: Cabin Weekend\nLocation: Denver, CO\n2026-09-04 7:00 PM — arrive",
    );
    expect(content.trip.siteName).toBe("Cabin Weekend");
    expect(content.trip.startDate).toBe("2026-09-04");
    expect(content.trip.location).toBe("Denver, CO");
    expect(content.trip.endDate).toBeUndefined();
    expect(content.lodging).toBeUndefined();
    expect(content.schedule?.[0].entries[0].title).toBe("arrive");
    expect(review.facts.find((item) => item.path === "trip.endDate")?.status).toBe("missing");
    expect(review.facts.find((item) => item.path === "lodging.name")?.status).toBe("missing");
  });

  it("does not turn malformed dates or timezone-free times into settled facts", () => {
    const { content, review } = ingestEventPlan(
      "Trip: Lake house\nDate: 2026-02-30\nDinner at 7:00 PM\nWhere: TBD",
    );
    expect(content.trip.startDate).toBeUndefined();
    expect(content.schedule).toBeUndefined();
    expect(review.facts.find((item) => item.path === "trip.startDate")?.note).toMatch(/Could not use/);
    expect(review.facts.find((item) => item.path === "trip.timezone")?.status).toBe("missing");
    expect(content.trip.location).toBeUndefined();
    expect(review.facts.find((item) => item.path === "trip.location")?.status).toBe("missing");
  });

  it("preserves explicit structured overrides over extracted values", () => {
    const { content } = ingestEventPlan("Event: Notes title\n2026-09-04", {
      siteName: "Structured title",
      startDate: "2026-10-10",
      endDate: "2026-10-12",
    });
    expect(content.trip).toMatchObject({
      siteName: "Structured title",
      startDate: "2026-10-10",
      endDate: "2026-10-12",
    });
  });

  it("does not confirm a missing start date when only the end date is overridden", () => {
    const { content, review } = ingestEventPlan("Event: Cabin Weekend", { endDate: "2026-10-12" });
    expect(content.trip.startDate).toBeUndefined();
    expect(content.trip.endDate).toBe("2026-10-12");
    expect(review.facts.find((item) => item.path === "trip.startDate")).toMatchObject({ status: "missing" });
    expect(review.facts.find((item) => item.path === "trip.endDate")).toMatchObject({ status: "confirmed", value: "2026-10-12" });
  });

  it("recomputes canonical fact values and confirms edited values", () => {
    const initial = ingestEventPlan("Event: Notes title\nLocation: Old place");
    const facts = draftFactsForContent(
      { ...initial.content, trip: { ...initial.content.trip, siteName: "Edited title", location: "New place" } },
      initial.review.facts,
    );
    expect(facts.find((item) => item.path === "trip.siteName")).toMatchObject({ status: "confirmed", value: "Edited title" });
    expect(facts.find((item) => item.path === "trip.location")).toMatchObject({ status: "confirmed", value: "New place" });
  });

  it("strips an em dash after the time so the schedule title is the event name", () => {
    const { content } = ingestEventPlan(
      "Cabin weekend\nLocation: Denver, CO\n2026-09-04 7:00 PM — group dinner\nLodging: still deciding",
    );
    expect(content.schedule?.[0].entries[0]).toMatchObject({ time: "7:00 PM", title: "group dinner" });
  });

  it("strips en dash and hyphen separators after the time", () => {
    const enDash = ingestEventPlan("Cabin weekend\n2026-09-04 7:00 PM – group dinner");
    const hyphen = ingestEventPlan("Cabin weekend\n2026-09-04 7:00 PM - group dinner");
    expect(enDash.content.schedule?.[0].entries[0].title).toBe("group dinner");
    expect(hyphen.content.schedule?.[0].entries[0].title).toBe("group dinner");
  });

  it("keeps schedule titles that start with a word when there is no separator", () => {
    const { content } = ingestEventPlan("Cabin weekend\n2026-09-04 7:00 PM group dinner");
    expect(content.schedule?.[0].entries[0]).toMatchObject({ time: "7:00 PM", title: "group dinner" });
  });

  it("uses the weekday as the day label instead of Plan for a one-day dated plan", () => {
    const { content } = ingestEventPlan("Cabin weekend\n2026-09-04 7:00 PM — group dinner");
    expect(content.schedule).toHaveLength(1);
    expect(content.schedule?.[0]).toMatchObject({
      date: "2026-09-04",
      weekday: "Friday",
      label: "Friday",
    });
    expect(content.schedule?.[0].label).not.toBe("Plan");
  });

  it("formats a one-day ingest as a human dateLabel, not ISO concatenation", () => {
    const { content } = ingestEventPlan("Cabin weekend\n2026-09-04 7:00 PM — group dinner");
    expect(content.trip.dateLabel).toBe("Sep 4, 2026");
    expect(content.trip.dateLabel).not.toMatch(/2026-09-04/);
  });

  it("formats a same-day start/end override as a single human date", () => {
    const { content } = ingestEventPlan("Event: Dinner", {
      startDate: "2026-09-04",
      endDate: "2026-09-04",
    });
    expect(content.trip.dateLabel).toBe("Sep 4, 2026");
    expect(content.trip.dateLabel).not.toBe("2026-09-04 – 2026-09-04");
  });

  it("formats a multi-day ingest as a human date range", () => {
    const { content } = ingestEventPlan("Event: Cabin Weekend", {
      startDate: "2026-09-04",
      endDate: "2026-09-06",
    });
    expect(content.trip.dateLabel).toBe("Sep 4, 2026 – Sep 6, 2026");
  });

  it("requires explicit review before publishing and strips private review metadata", () => {
    const { content } = ingestEventPlan("Event: Cabin Weekend");
    expect(reviewComplete(content.draftReview)).toBe(false);
    const reviewed = { ...content, draftReview: { ...content.draftReview!, acknowledged: true } };
    expect(reviewComplete(reviewed.draftReview)).toBe(true);
    expect(stripDraftReview(reviewed).draftReview).toBeUndefined();
  });

  it("uses a short first unlabeled line as the title and does not swallow the dump", () => {
    const { content, review } = ingestEventPlan(
      "Cabin weekend in Denver, Sep 4-6, pack layers and a swimsuit",
      { preset: "weekend" },
    );
    expect(content.trip.siteName).toBe("Cabin weekend");
    expect(content.trip.siteName).not.toMatch(/pack layers|Denver|Sep 4/);
    expect(content.trip.location).toBeUndefined();
    expect(content.trip.startDate).toBeUndefined();
    expect(review.sourcePlan).toContain("pack layers");
  });

  it("keeps a dedicated first unlabeled line as the title", () => {
    const { content } = ingestEventPlan("Cabin weekend\nDenver\nSep 4-6, pack layers");
    expect(content.trip.siteName).toBe("Cabin weekend");
  });

  it("does not invent a time, place, address, or headcount from prose", () => {
    const { content } = ingestEventPlan(
      "Let's do something fun, maybe 20 people at a place downtown around 7 if we can find a table",
    );
    expect(content.trip.startDate).toBeUndefined();
    expect(content.trip.location).toBeUndefined();
    expect(content.lodging).toBeUndefined();
    expect(content.schedule).toBeUndefined();
    expect(content.rsvp?.maxPartySize).toBeUndefined();
  });

  it("treats lodging TBD as missing instead of a place name", () => {
    const { content, review } = ingestEventPlan(
      "Cabin weekend\nLodging: still deciding\nLocation: unknown",
    );
    expect(content.lodging).toBeUndefined();
    expect(content.trip.location).toBeUndefined();
    expect(review.facts.find((item) => item.path === "lodging.name")?.status).toBe("missing");
  });

  it("does not settle abbreviation timezones as logistics", () => {
    const { content, review } = ingestEventPlan("Dinner\nTimezone: ET\n2026-09-04 7:00 PM — dinner");
    expect(content.trip.timezone).toBeUndefined();
    expect(review.facts.find((item) => item.path === "trip.timezone")?.note).toMatch(/IANA/);
  });

  it("extracts an IANA timezone when the host wrote one", () => {
    const { content, review } = ingestEventPlan("Dinner\nTimezone: America/Denver");
    expect(content.trip.timezone).toBe("America/Denver");
    expect(review.facts.find((item) => item.path === "trip.timezone")?.status).toBe("extracted");
  });

  it("extracts an explicit pack list without inventing items", () => {
    const { content } = ingestEventPlan("Cabin weekend\nPack: Government ID, Layers — nights drop below 40");
    expect(content.packing).toEqual([
      { title: "Government ID" },
      { title: "Layers", note: "nights drop below 40" },
    ]);
  });

  it("stores night-out and weekend as the same Event with different presets", () => {
    const night = ingestEventPlan("Thursday dinner", { preset: "night-out" });
    const weekend = ingestEventPlan("Cabin weekend", { preset: "weekend" });
    expect(night.content.preset).toBe("night-out");
    expect(weekend.content.preset).toBe("weekend");
    expect(night.content.trip.siteName).toBe("Thursday dinner");
    expect(weekend.content.schedule).toBeUndefined();
    expect(weekend.content.lodging).toBeUndefined();
  });

  it("lifts night-out when/where/what onto trip and leaves weekend blocks off", () => {
    const { content } = ingestEventPlan(
      "Thursday dinner\nLocation: Rita's\nWhat: First round is on us\n2026-09-04 7:00 PM — drinks\nLodging: still deciding\nPack: Jacket",
      { preset: "night-out" },
    );
    expect(content.preset).toBe("night-out");
    expect(content.trip.startDate).toBe("2026-09-04");
    expect(content.trip.startTime).toBe("7:00 PM");
    expect(content.trip.location).toBe("Rita's");
    expect(content.trip.tagline).toBe("First round is on us");
    expect(content.schedule).toBeUndefined();
    expect(content.lodging).toBeUndefined();
    expect(content.packing).toBeUndefined();
    expect(content.presentation?.style).toBe("clean");
  });
});
