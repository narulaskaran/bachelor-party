/** User-facing copy when the notes reader cannot run. Never includes env names. */
export const NOTES_UNAVAILABLE_MESSAGE =
  "Couldn't read your notes right now. Try again in a minute.";

export class PlanExtractionUnavailableError extends Error {
  constructor(message = NOTES_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "PlanExtractionUnavailableError";
  }
}

export function isPlanExtractionUnavailable(error: unknown): boolean {
  return error instanceof PlanExtractionUnavailableError;
}
