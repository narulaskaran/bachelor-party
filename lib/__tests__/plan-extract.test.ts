import { afterEach, describe, expect, it } from "vitest";
import { factsFromModelOutput, extractPlanWithOpenRouter } from "@/lib/plan-extract";
import { PlanExtractionUnavailableError } from "@/lib/plan-ingest-errors";

const MESSY =
  "yeah so friday drinks at the dead rabbit in nyc september 4 around seven we should get there early I don't know the address yet maybe 12 people";

describe("factsFromModelOutput", () => {
  it("keeps stated venue/date/time and drops address, timezone, and headcount", () => {
    const facts = factsFromModelOutput(
      {
        siteName: "Friday drinks",
        tagline: null,
        startDate: "2026-09-04",
        endDate: null,
        startTime: "7:00 PM",
        location: "The Dead Rabbit, NYC",
        address: null,
        timezone: null,
        lodgingName: null,
        packing: null,
        schedule: null,
      },
      MESSY,
    );
    expect(facts).toMatchObject({
      siteName: "Friday drinks",
      startDate: "2026-09-04",
      startTime: "7:00 PM",
      location: "The Dead Rabbit, NYC",
    });
    expect(facts.address).toBeUndefined();
    expect(facts.timezoneRaw).toBeUndefined();
    expect(facts).not.toHaveProperty("maxPartySize");
  });

  it("drops an IANA timezone the host never wrote", () => {
    const facts = factsFromModelOutput(
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
      MESSY,
    );
    expect(facts.timezoneRaw).toBeUndefined();
  });

  it("keeps a non-IANA abbreviation so review can mark it missing", () => {
    const facts = factsFromModelOutput(
      {
        siteName: "Dinner",
        tagline: null,
        startDate: "2026-09-04",
        endDate: null,
        startTime: "7:00 PM",
        location: null,
        address: null,
        timezone: "ET",
        lodgingName: null,
        packing: null,
        schedule: null,
      },
      "Dinner\nTimezone: ET",
    );
    expect(facts.timezoneRaw).toBe("ET");
  });

  it("treats TBD placeholders as empty", () => {
    const facts = factsFromModelOutput(
      {
        siteName: "Cabin",
        tagline: null,
        startDate: null,
        endDate: null,
        startTime: null,
        location: "TBD",
        address: "unknown",
        timezone: null,
        lodgingName: "still deciding",
        packing: null,
        schedule: null,
      },
      "Cabin\nLocation: TBD",
    );
    expect(facts.location).toBeUndefined();
    expect(facts.address).toBeUndefined();
    expect(facts.lodging).toBeUndefined();
  });
});

describe("extractPlanWithOpenRouter", () => {
  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  it("fails clearly when the key is missing and does not leak the env name", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(extractPlanWithOpenRouter("Friday drinks")).rejects.toBeInstanceOf(
      PlanExtractionUnavailableError,
    );
    await expect(extractPlanWithOpenRouter("Friday drinks")).rejects.not.toThrow(/OPENROUTER/);
  });
});
