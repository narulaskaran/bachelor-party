/** User-facing copy when the notes reader cannot run. Never includes env names. */
export const NOTES_UNAVAILABLE_MESSAGE =
  "Couldn't read your notes right now. Try again in a minute.";

/** GLM 5.3 Flash always reasons; slow providers often take ~20s. Abort must outlast that. */
export const PLAN_EXTRACT_TIMEOUT_MS = 50_000;

export class PlanExtractionUnavailableError extends Error {
  constructor(message = NOTES_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "PlanExtractionUnavailableError";
  }
}

export function isPlanExtractionUnavailable(error: unknown): boolean {
  return error instanceof PlanExtractionUnavailableError;
}

/** Fetch/abort timeouts the landing create must surface as notes-unavailable, not a hang. */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("name" in error)) return false;
  const name = String(error.name);
  return name === "AbortError" || name === "TimeoutError";
}
