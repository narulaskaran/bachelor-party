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
    expect(content.schedule?.[0].entries[0].title).toContain("arrive");
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
    expect(content.trip.location).toBe("TBD");
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

  it("requires explicit review before publishing and strips private review metadata", () => {
    const { content } = ingestEventPlan("Event: Cabin Weekend");
    expect(reviewComplete(content.draftReview)).toBe(false);
    const reviewed = { ...content, draftReview: { ...content.draftReview!, acknowledged: true } };
    expect(reviewComplete(reviewed.draftReview)).toBe(true);
    expect(stripDraftReview(reviewed).draftReview).toBeUndefined();
  });
});
