import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractionPrompt,
  factsFromModelOutput,
  extractPlanWithOpenRouter,
  PLAN_EXTRACT_TIMEOUT_MS,
  withOpenRouterReasoning,
} from "@/lib/plan-extract";
import { PlanExtractionUnavailableError } from "@/lib/plan-ingest-errors";
import { maxDuration as createTripMaxDuration } from "@/app/api/admin/trips/route";

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: generateTextMock,
  };
});

const MESSY =
  "yeah so friday drinks at the dead rabbit in nyc september 4 around seven we should get there early I don't know the address yet maybe 12 people";
const AIRPORT_CONFUSION = "Alaska JFK→SFO then dinner in the Mission.";
const ONE_SHOT_JFK_EXAMPLE =
  'For example, "Alaska JFK→SFO then dinner in the Mission." means location="the Mission"; JFK and SFO are not the location.';

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

describe("extractionPrompt", () => {
  const prompt = extractionPrompt(AIRPORT_CONFUSION, "2026-09-01");

  it("keeps the general travel-vs-venue rule and is not a one-shot of the JFK sentence", () => {
    expect(prompt).toContain("Separate travel logistics from event logistics.");
    expect(prompt).toContain(
      "Airport codes, airlines, flight numbers, and airport-to-airport routes are travel details, not event locations.",
    );
    expect(prompt).toContain(
      "Do not use a departure airport, arrival airport, or transit point as the event location unless the host explicitly says the event happens there.",
    );
    expect(prompt).not.toContain(ONE_SHOT_JFK_EXAMPLE);
    expect(prompt).toContain(AIRPORT_CONFUSION);
  });

  it("covers a short diverse set of location vs travel cases", () => {
    expect(prompt).toContain('"the Mission" (not JFK/SFO); address null');
    expect(prompt).toContain("LGA terminal B");
    expect(prompt).toContain("SFO United Club");
    expect(prompt).toContain("cabin in Leavenworth");
    expect(prompt).toContain("Penn Station");
    expect(prompt).toContain("we're all flying JFK to DEN");
    expect(prompt).toContain("Rita's on 6th");
    expect(prompt).toContain("Catskills");
    expect(prompt).toContain("never pick an airport as Where");
    expect(prompt).toContain("Never invent a street address");
  });
});

describe("withOpenRouterReasoning", () => {
  it("asks GLM to reason at low effort so extraction can finish before abort", () => {
    const init = withOpenRouterReasoning({
      method: "POST",
      body: JSON.stringify({ model: "z-ai/glm-5.3-flash", messages: [] }),
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "z-ai/glm-5.3-flash",
      reasoning: { effort: "low" },
    });
  });

  it("does not overwrite an explicit reasoning payload", () => {
    const init = withOpenRouterReasoning({
      body: JSON.stringify({ reasoning: { effort: "high" } }),
    });
    expect(JSON.parse(String(init?.body))).toEqual({ reasoning: { effort: "high" } });
  });

  it("leaves non-JSON bodies alone", () => {
    const init = { body: "not-json" };
    expect(withOpenRouterReasoning(init)).toBe(init);
  });
});

describe("extractPlanWithOpenRouter", () => {
  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    generateTextMock.mockReset();
    vi.useRealTimers();
  });

  it("fails clearly when the key is missing and does not leak the env name", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(extractPlanWithOpenRouter("Friday drinks")).rejects.toBeInstanceOf(
      PlanExtractionUnavailableError,
    );
    await expect(extractPlanWithOpenRouter("Friday drinks")).rejects.not.toThrow(/OPENROUTER/);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("gives OpenRouter more than 20s and keeps the route maxDuration above that abort", () => {
    expect(PLAN_EXTRACT_TIMEOUT_MS).toBeGreaterThan(20_000);
    expect(createTripMaxDuration * 1000).toBeGreaterThan(PLAN_EXTRACT_TIMEOUT_MS);
  });

  it("passes an abort signal and a bounded output budget into generateText", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    generateTextMock.mockResolvedValueOnce({
      output: {
        siteName: "dinner in the Mission",
        tagline: null,
        startDate: null,
        endDate: null,
        startTime: null,
        location: "the Mission",
        address: null,
        timezone: null,
        lodgingName: null,
        packing: null,
        schedule: null,
      },
    });

    const facts = await extractPlanWithOpenRouter(AIRPORT_CONFUSION);
    expect(facts).toMatchObject({
      siteName: "dinner in the Mission",
      location: "the Mission",
    });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const call = generateTextMock.mock.calls[0]?.[0] as {
      abortSignal?: AbortSignal;
      maxOutputTokens?: number;
      maxRetries?: number;
      providerOptions?: { openai?: { reasoningEffort?: string } };
      prompt?: string;
    };
    expect(call.abortSignal).toBeInstanceOf(AbortSignal);
    expect(call.maxOutputTokens).toBe(2048);
    expect(call.maxRetries).toBe(1);
    expect(call.providerOptions?.openai?.reasoningEffort).toBe("low");
    expect(call.prompt).toContain("Separate travel logistics from event logistics.");
    expect(call.prompt).toContain(AIRPORT_CONFUSION);
    expect(call.prompt).not.toContain(ONE_SHOT_JFK_EXAMPLE);
  });

  it("does not abort a 20s OpenRouter completion, then maps a later abort to unavailable", async () => {
    vi.useFakeTimers();
    process.env.OPENROUTER_API_KEY = "test-key";
    generateTextMock.mockImplementation(
      ({ abortSignal }: { abortSignal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          abortSignal.addEventListener("abort", () => {
            const err = new Error("This operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    );
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const pending = extractPlanWithOpenRouter("Friday drinks");
    let settled = false;
    void pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await vi.advanceTimersByTimeAsync(20_000);
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(PLAN_EXTRACT_TIMEOUT_MS - 20_000);
    await expect(pending).rejects.toBeInstanceOf(PlanExtractionUnavailableError);
    expect(settled).toBe(true);
    expect(logged).toHaveBeenCalled();
    expect(String(logged.mock.calls[0]?.[0])).toBe("plan extraction failed");
    logged.mockRestore();
  });
});
