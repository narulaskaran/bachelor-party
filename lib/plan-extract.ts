import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, generateText, LoadAPIKeyError, Output } from "ai";
import { z } from "zod";
import { PlanExtractionUnavailableError } from "@/lib/plan-ingest-errors";
import type { ExtractedPlanFacts, ExtractedScheduleEntry } from "@/lib/plan-ingestion";
import { isValidCalendarDate } from "@/lib/trip-dates";

export const OPENROUTER_MODEL = "z-ai/glm-5.3-flash";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

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

/** Map model JSON into extracted facts. Drops invented timezone and unknown placeholders. */
export function factsFromModelOutput(raw: unknown, plan: string): ExtractedPlanFacts {
  const parsed = extractedPlanSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PlanExtractionUnavailableError();
  }
  const output = parsed.data;
  const siteName = settledText(output.siteName)?.slice(0, 100);
  const tagline = settledText(output.tagline);
  const startDate = validIso(output.startDate);
  const endDate = validIso(output.endDate);
  const startTime = settledText(output.startTime);
  const location = settledText(output.location);
  const address = settledText(output.address);
  const lodging = settledText(output.lodgingName);
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

function extractionPrompt(plan: string, today: string): string {
  return `Today (UTC) is ${today}.

Extract only facts the host actually wrote in the notes below. Return JSON.

Rules:
- Never invent a time, place, street address, timezone, lodging, packing item, schedule row, or headcount.
- Never default 7pm, 19:00, or America/New_York.
- If a fact is missing, ambiguous, hedged ("maybe", "if we can", "I don't know"), or TBD, return null for that field.
- siteName: a short event name they implied (e.g. "Friday drinks"), not the whole paragraph.
- startDate / endDate: YYYY-MM-DD only. If they named a month and day without a year, use the next occurrence on or after today. If the calendar day is still ambiguous, null.
- startTime: a clock they stated, including "around seven" / "7-ish" as "7:00 PM". Null if they did not mention a time.
- location: venue and/or city they named. Not a guessed street address.
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
    headers: {
      "HTTP-Referer": "https://party.narula.xyz",
      "X-Title": "The Big Send",
    },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const { output } = await generateText({
      model: openrouter.chat(OPENROUTER_MODEL),
      output: Output.object({
        schema: extractedPlanSchema,
        name: "event_plan",
        description: "Facts the host stated. Null when unknown.",
      }),
      temperature: 0,
      abortSignal: controller.signal,
      providerOptions: {
        openai: { strictJsonSchema: false },
      },
      system:
        "You extract event logistics from messy host notes. You never invent facts. You never guess a timezone from a city.",
      prompt: extractionPrompt(plan, today),
    });
    return factsFromModelOutput(output, plan);
  } catch (error) {
    if (error instanceof PlanExtractionUnavailableError) throw error;
    if (error instanceof LoadAPIKeyError || APICallError.isInstance(error)) {
      throw new PlanExtractionUnavailableError();
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new PlanExtractionUnavailableError();
    }
    throw new PlanExtractionUnavailableError();
  } finally {
    clearTimeout(timer);
  }
}
