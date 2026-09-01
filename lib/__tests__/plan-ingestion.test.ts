import { describe, expect, it } from "vitest";
import { PlanExtractionUnavailableError } from "@/lib/plan-ingest-errors";
import {
  draftFactsForContent,
  heuristicFallbackUseful,
  ingestEventPlan,
  ingestEventPlanFromHeuristics as ingestEventPlanHeuristics,
  reviewComplete,
  stripDraftReview,
} from "@/lib/plan-ingestion";

describe("messy event plan ingestion", () => {
  const ingestEventPlan = ingestEventPlanHeuristics;
  it("rejects empty input as an unreviewed draft with no invented logistics", () => {
    const { content, review } = ingestEventPlan("   ");
    expect(content.trip.siteName).toBe("Untitled event");
    expect(content.trip.startDate).toBeUndefined();
    expect(content.trip.location).toBeUndefined();
    expect(review.acknowledged).toBe(false);
    expect(review.facts.find((item) => item.path === "trip.siteName")).toMatchObject({
      status: "missing",
    });
    expect(review.facts.find((item) => item.path === "trip.siteName")?.value).toBeUndefined();
    expect(review.facts.filter((item) => item.status === "missing").map((item) => item.path)).toEqual(
      expect.arrayContaining(["trip.siteName", "trip.startDate", "trip.location", "lodging.name", "trip.timezone"]),
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

  it("keeps a timezone-free extracted clock explicitly unconfirmed in review facts", () => {
    const { content, review } = ingestEventPlan("Event: Dinner\n2026-09-04 7:00 PM — dinner");
    const initialWhen = review.facts.find((item) => item.path === "trip.startDate");
    expect(content.trip.startTime).toBe("7:00 PM");
    expect(initialWhen).toMatchObject({
      status: "extracted",
      value: "2026-09-04",
    });

    const editedFacts = draftFactsForContent(
      { ...content, trip: { ...content.trip, startTime: "8:00 PM" } },
      review.facts,
    );
    expect(editedFacts.find((item) => item.path === "trip.startDate")).toMatchObject({
      status: "extracted",
      value: "2026-09-04 8:00 PM",
    });
    expect(editedFacts.find((item) => item.path === "trip.startDate")?.note).toMatch(/timezone needed/i);
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

  it("keeps celebration drafts focused by default but preserves supplied optional logistics", () => {
    const { content, review } = ingestEventPlan(
      "Maya's birthday\nLocation: Rita's\nLodging: The Garden Room\nPack: candles\n2026-09-04 7:00 PM — cake",
      { preset: "celebration" },
    );
    expect(content.preset).toBe("celebration");
    expect(content.trip.location).toBe("Rita's");
    expect(content.schedule?.[0].entries[0].title).toBe("cake");
    expect(content.packing).toEqual([{ title: "candles" }]);
    expect(content.lodging).toEqual({ name: "The Garden Room" });
    expect(review.facts.find((item) => item.path === "lodging.name")).toMatchObject({
      status: "extracted",
      value: "The Garden Room",
    });
  });

  it("uses the stated range end and a Lodge: name, not a guessed middle day", () => {
    const { content, review } = ingestEventPlan(
      [
        "Moab weekend",
        "2026-10-02 to 2026-10-04",
        "Lodge: Red Cliffs Lodge",
        "2026-10-02 3:00 PM — check in",
        "2026-10-03 9:00 AM — hike",
      ].join("\n"),
      { preset: "weekend" },
    );
    expect(content.trip.startDate).toBe("2026-10-02");
    expect(content.trip.endDate).toBe("2026-10-04");
    expect(content.trip.dateLabel).toMatch(/Oct 2[\s\S]*Oct 4/);
    expect(content.lodging?.name).toBe("Red Cliffs Lodge");
    expect(review.facts.find((item) => item.path === "trip.endDate")).toMatchObject({
      status: "extracted",
      value: "2026-10-04",
    });
    expect(review.facts.find((item) => item.path === "lodging.name")).toMatchObject({
      status: "extracted",
      value: "Red Cliffs Lodge",
    });
  });

  it("leaves the end date TBD when extra dates are listed without a range", () => {
    const { content, review } = ingestEventPlan(
      "Cabin weekend\n2026-10-02 3:00 PM — arrive\n2026-10-03 9:00 AM — hike\n2026-10-04 10:00 AM — depart",
    );
    expect(content.trip.startDate).toBe("2026-10-02");
    expect(content.trip.endDate).toBeUndefined();
    expect(review.facts.find((item) => item.path === "trip.endDate")?.status).toBe("missing");
  });
});

const MESSY_VOICE =
  "yeah so friday drinks at the dead rabbit in nyc september 4 around seven we should get there early I don't know the address yet maybe 12 people";

describe("model-backed event plan ingestion", () => {
  it("extracts stated facts from a messy unlabeled paragraph and leaves the rest TBD", async () => {
    const { content, review } = await ingestEventPlan(
      MESSY_VOICE,
      { preset: "night-out" },
      {
        now: new Date("2026-08-27T12:00:00Z"),
        extract: async () => ({
          siteName: "Friday drinks",
          startDate: "2026-09-04",
          startTime: "7:00 PM",
          location: "The Dead Rabbit, NYC",
        }),
      },
    );
    expect(content.trip.siteName).toBe("Friday drinks");
    expect(content.trip.startDate).toBe("2026-09-04");
    expect(content.trip.startTime).toBe("7:00 PM");
    expect(content.trip.location).toBe("The Dead Rabbit, NYC");
    expect(content.trip.timezone).toBeUndefined();
    expect(content.trip.address).toBeUndefined();
    expect(content.rsvp?.maxPartySize).toBeUndefined();
    expect(content.draftReview?.acknowledged).toBe(false);
    expect(review.acknowledged).toBe(false);
    expect(review.facts.find((item) => item.path === "trip.timezone")?.status).toBe("missing");
    expect(review.facts.find((item) => item.path === "trip.location")?.status).toBe("extracted");
    expect(review.facts.find((item) => item.path === "trip.startDate")).toMatchObject({
      status: "extracted",
      value: "2026-09-04 7:00 PM",
    });
  });

  it("does not invent a date, place, address, or headcount from an unlabeled dump", async () => {
    const { content, review } = await ingestEventPlan(
      "Let's do something fun, maybe 20 people at a place downtown around 7 if we can find a table",
      {},
      { extract: async () => ({}) },
    );
    expect(content.trip.siteName).toBe("Untitled event");
    expect(content.trip.startDate).toBeUndefined();
    expect(content.trip.location).toBeUndefined();
    expect(content.trip.address).toBeUndefined();
    expect(content.trip.startTime).toBeUndefined();
    expect(content.lodging).toBeUndefined();
    expect(content.schedule).toBeUndefined();
    expect(content.rsvp?.maxPartySize).toBeUndefined();
    expect(review.facts.find((item) => item.path === "trip.siteName")).toMatchObject({ status: "missing" });
    expect(review.facts.find((item) => item.path === "trip.siteName")?.value).toBeUndefined();
    expect(review.facts.find((item) => item.path === "trip.startDate")?.status).toBe("missing");
    expect(review.facts.find((item) => item.path === "trip.location")?.status).toBe("missing");
    expect(draftFactsForContent(content, review.facts).find((item) => item.path === "trip.siteName")).toMatchObject({
      status: "missing",
    });
  });

  it.each([
    ["meet at LGA terminal B Friday", { location: "LGA terminal B" }],
    ["driving up to the Catskills Friday", { location: "the Catskills" }],
  ] as const)("does not confirm Untitled event as Event name when the dump named no event (%s)", async (plan, extracted) => {
    const { content, review } = await ingestEventPlan(
      plan,
      { preset: "night-out" },
      { extract: async () => extracted },
    );
    expect(content.trip.siteName).toBe("Untitled event");
    expect(content.trip.location).toBe(extracted.location);
    const name = review.facts.find((item) => item.path === "trip.siteName");
    expect(name).toMatchObject({ status: "missing" });
    expect(name?.value).toBeUndefined();
    expect(name?.status).not.toBe("confirmed");
    expect(name?.status).not.toBe("extracted");
    expect(review.facts.find((item) => item.path === "trip.location")).toMatchObject({
      status: "extracted",
      value: extracted.location,
    });
    const reconciled = draftFactsForContent(content, review.facts);
    expect(reconciled.find((item) => item.path === "trip.siteName")).toMatchObject({ status: "missing" });
    expect(reconciled.find((item) => item.path === "trip.siteName")?.value).toBeUndefined();
    expect(reconciled.find((item) => item.path === "trip.location")).toMatchObject({
      status: "extracted",
      value: extracted.location,
    });
  });

  it("treats a non-IANA timezone as missing even if the model returned one", async () => {
    const { content, review } = await ingestEventPlan(
      "Dinner\nTimezone: ET\n2026-09-04 7:00 PM — dinner",
      { preset: "night-out" },
      {
        extract: async () => ({
          siteName: "Dinner",
          startDate: "2026-09-04",
          startTime: "7:00 PM",
          timezoneRaw: "ET",
        }),
      },
    );
    expect(content.trip.timezone).toBeUndefined();
    expect(review.facts.find((item) => item.path === "trip.timezone")).toMatchObject({
      status: "missing",
    });
    expect(review.facts.find((item) => item.path === "trip.timezone")?.note).toMatch(/IANA/);
  });

  it("still reads labeled-line dumps through the shared ingest path", async () => {
    const { content, review } = await ingestEventPlan(
      "Event: Cabin Weekend\nLocation: Denver, CO\n2026-09-04 7:00 PM — arrive",
      { preset: "weekend" },
      {
        extract: async () => ({
          siteName: "Cabin Weekend",
          location: "Denver, CO",
          startDate: "2026-09-04",
          startTime: "7:00 PM",
          scheduleEntries: [{ date: "2026-09-04", time: "7:00 PM", title: "arrive" }],
        }),
      },
    );
    expect(content.trip.siteName).toBe("Cabin Weekend");
    expect(content.trip.location).toBe("Denver, CO");
    expect(content.trip.startDate).toBe("2026-09-04");
    expect(content.schedule?.[0].entries[0].title).toBe("arrive");
    expect(review.acknowledged).toBe(false);
  });

  it("falls back to the labeled parser when the model is down", async () => {
    const { content } = await ingestEventPlan(
      "Event: Dinner\nLocation: Rita's\n2026-09-04 7:00 PM — drinks",
      { preset: "night-out" },
      {
        extract: async () => {
          throw new PlanExtractionUnavailableError();
        },
      },
    );
    expect(content.trip.siteName).toBe("Dinner");
    expect(content.trip.location).toBe("Rita's");
    expect(content.trip.startDate).toBe("2026-09-04");
  });

  it("fails clearly on unlabeled prose when the model is down instead of an empty Untitled draft", async () => {
    await expect(
      ingestEventPlan(MESSY_VOICE, { preset: "night-out" }, {
        extract: async () => {
          throw new PlanExtractionUnavailableError();
        },
      }),
    ).rejects.toBeInstanceOf(PlanExtractionUnavailableError);
    expect(heuristicFallbackUseful(MESSY_VOICE)).toBe(false);
  });

  it("never copies a timezone the host did not write", async () => {
    const { content, review } = await ingestEventPlan(
      MESSY_VOICE,
      { preset: "night-out" },
      {
        extract: async (plan) => {
          const { factsFromModelOutput } = await import("@/lib/plan-extract");
          return factsFromModelOutput(
            {
              siteName: "Friday drinks",
              tagline: null,
              startDate: "2026-09-04",
              endDate: null,
              startTime: "7:00 PM",
              location: "The Dead Rabbit, NYC",
              address: null,
              timezone: "America/New_York",
              lodgingName: null,
              packing: null,
              schedule: null,
            },
            plan,
          );
        },
      },
    );
    expect(content.trip.timezone).toBeUndefined();
    expect(review.facts.find((item) => item.path === "trip.timezone")?.status).toBe("missing");
  });
});
