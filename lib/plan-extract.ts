import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, generateText, Output } from "ai";
import { z } from "zod";
import {
  PLAN_EXTRACT_TIMEOUT_MS,
  PlanExtractionUnavailableError,
} from "@/lib/plan-ingest-errors";
import {
  statedExtractedTitle,
  type ExtractedPlanFacts,
  type ExtractedScheduleEntry,
} from "@/lib/plan-ingestion";
import { isValidCalendarDate } from "@/lib/trip-dates";

export const OPENROUTER_MODEL = "z-ai/glm-5.3-flash";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export { PLAN_EXTRACT_TIMEOUT_MS };
export const OPENROUTER_REASONING = { effort: "low" as const };

/** Inject OpenRouter's unified reasoning control onto an AI SDK fetch body. */
export function withOpenRouterReasoning(init?: RequestInit): RequestInit | undefined {
  if (!init || typeof init.body !== "string") return init;
  try {
    const parsed = JSON.parse(init.body) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return init;
    const body = parsed as Record<string, unknown>;
    if (body.reasoning) return init;
    return {
      ...init,
      body: JSON.stringify({ ...body, reasoning: OPENROUTER_REASONING }),
    };
  } catch {
    return init;
  }
}

export function openRouterFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const next = withOpenRouterReasoning(init);
  if (next?.signal?.aborted) {
    return Promise.reject(
      next.signal.reason ?? new DOMException("This operation was aborted", "AbortError"),
    );
  }
  return fetch(input, next);
}

function logPlanExtractionFailure(error: unknown, aborted: boolean): void {
  if (APICallError.isInstance(error)) {
    console.error("plan extraction failed", { status: error.statusCode, aborted });
    return;
  }
  console.error("plan extraction failed", {
    name: error instanceof Error ? error.name : typeof error,
    aborted,
  });
}

const UNKNOWN_VALUE_RE =
  /^(tbd|tba|n\/?a|unknown|still deciding|not sure|none|to be (decided|determined)|—|-|\.{3}|…)$/i;

const extractedPlanSchema = z.object({
  siteName: z.string().nullable(),
  tagline: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  startTime: z.string().nullable(),
  location: z.string().nullable(),
  address: z.string().nullable(),
  timezone: z.string().nullable(),
  lodgingName: z.string().nullable(),
  packing: z
    .array(
      z.object({
        title: z.string(),
        note: z.string().nullable(),
      }),
    )
    .nullable(),
  schedule: z
    .array(
      z.object({
        date: z.string(),
        time: z.string().nullable(),
        title: z.string(),
      }),
    )
    .nullable(),
});

export type ModelPlanOutput = z.infer<typeof extractedPlanSchema>;

function clean(value: string | null | undefined): string | undefined {
  const result = value?.replace(/^[-*•\s]+/, "").trim();
  return result || undefined;
}

function settledText(value: string | null | undefined): string | undefined {
  const cleaned = clean(value);
  return cleaned && !UNKNOWN_VALUE_RE.test(cleaned) ? cleaned : undefined;
}

function validIso(value: string | null | undefined): string | undefined {
  const cleaned = settledText(value);
  if (!cleaned) return undefined;
  const normalized = cleaned.replace(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    (_, year, month, day) => `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
  );
  return isValidCalendarDate(normalized) ? normalized : undefined;
}

function mentionedInPlan(plan: string, value: string): boolean {
  return plan.toLowerCase().includes(value.toLowerCase());
}

/** Map model JSON into extracted facts. Drops invented timezone, coined titles, and unknown placeholders. */
export function factsFromModelOutput(raw: unknown, plan: string): ExtractedPlanFacts {
  const parsed = extractedPlanSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PlanExtractionUnavailableError();
  }
  const output = parsed.data;
  const tagline = settledText(output.tagline);
  const startDate = validIso(output.startDate);
  const endDate = validIso(output.endDate);
  const startTime = settledText(output.startTime);
  const location = settledText(output.location);
  const address = settledText(output.address);
  const lodging = settledText(output.lodgingName);
  const siteName = statedExtractedTitle(plan, output.siteName ?? undefined, { location, lodging });
  const timezoneRaw = settledText(output.timezone);
  const timezoneMentioned = timezoneRaw ? mentionedInPlan(plan, timezoneRaw) : false;
  const packing = output.packing
    ?.map((item) => {
      const title = settledText(item.title);
      if (!title) return undefined;
      const note = settledText(item.note);
      return note ? { title, note } : { title };
    })
    .filter((item): item is { title: string; note?: string } => Boolean(item));
  const schedule = output.schedule
    ?.map((entry) => {
      const date = validIso(entry.date);
      const title = settledText(entry.title);
      if (!date || !title) return undefined;
      const time = settledText(entry.time);
      const item: ExtractedScheduleEntry = { date, title };
      if (time) item.time = time;
      return item;
    })
    .filter((item): item is ExtractedScheduleEntry => Boolean(item));

  const facts: ExtractedPlanFacts = {};
  if (siteName) facts.siteName = siteName;
  if (tagline) facts.tagline = tagline;
  if (startDate) facts.startDate = startDate;
  if (endDate) facts.endDate = endDate;
  if (startTime) facts.startTime = startTime;
  if (location) facts.location = location;
  if (address) facts.address = address;
  if (timezoneRaw && timezoneMentioned) facts.timezoneRaw = timezoneRaw;
  if (lodging) facts.lodging = lodging;
  if (packing?.length) facts.packing = packing;
  if (schedule?.length) facts.scheduleEntries = schedule;
  const malformed = [output.startDate, output.endDate]
    .map((value) => clean(value))
    .filter((value): value is string => Boolean(value) && !validIso(value));
  if (malformed.length) facts.malformedDates = [...new Set(malformed)];
  return facts;
}

/** Prompt sent to the extractor. */
export function extractionPrompt(plan: string, today: string): string {
  return `Today (UTC) is ${today}.

Extract only facts the host actually wrote in the notes below. Return JSON.

Rules:
- Never invent a time, place, street address, timezone, lodging, packing item, schedule row, headcount, or event title.
- Never default 7pm, 19:00, or America/New_York.
- If a fact is missing, ambiguous, hedged ("maybe", "if we can", "I don't know"), or TBD, return null for that field.
- siteName: only a title they wrote (e.g. "Friday drinks"), not the whole paragraph. Null if they did not name the event. Never coin a title from lodging, venue, city, or timing. "We're driving. Cabin in Lake Placid all weekend." → siteName null (Where is the cabin); "meet at LGA terminal B Friday" → siteName null.
- startDate / endDate: YYYY-MM-DD only. If they named a month and day without a year, use the next occurrence on or after today. If the calendar day is still ambiguous, null.
- startTime: a clock they stated, including "around seven" / "7-ish" as "7:00 PM". Null if they did not mention a time.
- Separate travel logistics from event logistics. Airport codes, airlines, flight numbers, and airport-to-airport routes are travel details, not event locations. So are transit hubs, transfer cities, and driving/train as transport.
- location: the venue, neighborhood, city, lodging, or other place where the event happens, explicitly associated with the event. Do not use a departure airport, arrival airport, or transit point as the event location unless the host explicitly says the event happens there. After ignoring transit (Amtrak, drive, fly into X, transfer cities), still extract the named destination, lodging, or venue. If they only described travel and named no venue, city, or lodging, location is null — never pick an airport as Where. Never invent a street address.
- e.g. "Delta into SEA, cabin in Leavenworth" → the cabin/Leavenworth, not SEA; "meet at LGA terminal B" → LGA terminal B; "Amtrak to Hudson then drive to the Catskills cabin" → the Catskills cabin, not Amtrak or Hudson.
- address: only an explicit street address. "I don't know the address" → null.
- timezone: only an IANA zone they wrote (e.g. America/Denver). City names are not timezones. Abbreviations (ET, EST, PT) stay as written only if present; do not convert them to IANA.
- lodgingName / packing / schedule: only what they listed. Do not infer a schedule from "get there early".
- There is no headcount field. Ignore "maybe 12 people" / "20 people if we can".

Notes:
${plan}`;
}

export async function extractPlanWithOpenRouter(
  plan: string,
  ctx: { now?: Date } = {},
): Promise<ExtractedPlanFacts> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new PlanExtractionUnavailableError();
  }

  const today = (ctx.now ?? new Date()).toISOString().slice(0, 10);
  const openrouter = createOpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    name: "openrouter",
    fetch: openRouterFetch,
    headers: {
      "HTTP-Referer": "https://party.narula.xyz",
      "X-Title": "The Big Send",
    },
  });

  const controller = new AbortController();
  // abortSignal alone can leave generateText pending (ignored abort, retry after
  // abort). Race so create fails at PLAN_EXTRACT_TIMEOUT_MS instead of hanging.
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new PlanExtractionUnavailableError());
    }, PLAN_EXTRACT_TIMEOUT_MS);
  });
  const extraction = generateText({
    model: openrouter.chat(OPENROUTER_MODEL),
    output: Output.object({
      schema: extractedPlanSchema,
      name: "event_plan",
      description: "Facts the host stated. Null when unknown.",
    }),
    temperature: 0,
    maxOutputTokens: 2048,
    maxRetries: 1,
    abortSignal: controller.signal,
    providerOptions: {
      openai: { strictJsonSchema: false, reasoningEffort: "low" },
    },
    system:
      "You extract event logistics from messy host notes. You never invent facts. You never coin an event title from lodging or timing. You never guess a timezone from a city.",
    prompt: extractionPrompt(plan, today),
  });
  void extraction.catch(() => {});
  try {
    const { output } = await Promise.race([extraction, timeout]);
    return factsFromModelOutput(output, plan);
  } catch (error) {
    logPlanExtractionFailure(error, controller.signal.aborted);
    if (error instanceof PlanExtractionUnavailableError) throw error;
    throw new PlanExtractionUnavailableError();
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
