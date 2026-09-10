/** User-facing copy when notes cannot become a draft. Honest: retry or labeled lines, no “in a minute”. */
export const NOTES_UNAVAILABLE_MESSAGE =
  "Couldn't turn those notes into a draft. Try again, or use labeled lines (Title / Dates / Location / Lodging).";

/** Same family as NOTES_UNAVAILABLE_MESSAGE — unparseable dumps are not fixed by waiting. */
export const NOTES_UNPARSEABLE_MESSAGE = NOTES_UNAVAILABLE_MESSAGE;

/** GLM 5.3 Flash always reasons; slow providers often take ~20s. Abort must outlast that. */
export const PLAN_EXTRACT_TIMEOUT_MS = 25_000;

/** Must stay above extract + slug/insert work, and above ingest deadline. */
export const CREATE_TRIP_MAX_DURATION_SECONDS = 40;

/**
 * Route-level deadline so a hung extractor still returns 503 before the
 * platform kills the function (TCP reset). Sits between extract abort and
 * maxDuration, with headroom for JSON/slug work.
 */
export const PLAN_INGEST_DEADLINE_MS = 28_000;

/**
 * Landing fetch abort: long enough to receive a 503 after ingest deadline,
 * short enough to finish before the function maxDuration reset.
 */
export const CREATE_TRIP_CLIENT_TIMEOUT_MS = 35_000;

export class PlanExtractionUnavailableError extends Error {
  constructor(message = NOTES_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "PlanExtractionUnavailableError";
  }
}

export class PlanNotesUnparseableError extends PlanExtractionUnavailableError {
  constructor(message = NOTES_UNPARSEABLE_MESSAGE) {
    super(message);
    this.name = "PlanNotesUnparseableError";
  }
}

export function isPlanExtractionUnavailable(error: unknown): boolean {
  return error instanceof PlanExtractionUnavailableError;
}

export function isPlanNotesUnparseable(error: unknown): boolean {
  return error instanceof PlanNotesUnparseableError;
}

/** Fetch/abort timeouts the landing create must surface as notes-unavailable, not a hang. */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("name" in error)) return false;
  const name = String(error.name);
  return name === "AbortError" || name === "TimeoutError";
}

/** Reject with notes-unavailable if `work` has not settled by the ingest deadline. */
export async function raceWithPlanIngestDeadline<T>(work: Promise<T>): Promise<T> {
  void work.catch(() => {});
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new PlanExtractionUnavailableError());
    }, PLAN_INGEST_DEADLINE_MS);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
