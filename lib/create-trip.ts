import {
  END_BEFORE_START_MESSAGE,
  formatDateLabel,
  isInvertedDateRange,
  optionalDate,
} from "@/lib/trip-dates";
import { parseEventPreset, type EventPreset } from "@/lib/event-preset";
import {
  isAbortError,
  NOTES_UNAVAILABLE_MESSAGE,
  PLAN_EXTRACT_TIMEOUT_MS,
} from "@/lib/plan-ingest-errors";
import { UNTITLED_EVENT_TITLE } from "@/lib/party-types";
import { unguessableEventSlug } from "@/lib/slug";

export { END_BEFORE_START_MESSAGE, formatDateLabel, isInvertedDateRange };

export type OrganizerPacket = {
  url: string;
  slug: string;
  password: string;
  adminToken: string;
};

export type CreateTripFields = {
  siteName: string;
  plan?: string;
  startDate?: string;
  endDate?: string;
  preset?: EventPreset;
  /** When omitted, the site generates an unguessable slug. API/CLI may still pass a name slug. */
  slug?: string;
};

export type CreateTripResult =
  | { ok: true; packet: OrganizerPacket }
  | { ok: false; error: string };

export const CREATE_TRIP_PATH = "/api/admin/trips";

const ENV_NAME_RE =
  /\b(ADMIN_UI_PASSWORD|ADMIN_API_TOKEN|DATABASE_URL|PARTY_PASSWORD|OPENROUTER_API_KEY)\b/;

/** POST siteName (and optional dates) to the public create API. No Authorization. */
export function createTripRequestInit(fields: CreateTripFields): RequestInit {
  const siteName = fields.siteName.trim();
  const plan = fields.plan?.trim();
  const startDate = optionalDate(fields.startDate);
  const endDate = optionalDate(fields.endDate);
  const preset = parseEventPreset(fields.preset);
  const slug = fields.slug?.trim() || unguessableEventSlug();
  if (plan) {
    const body: Record<string, unknown> = { slug, plan, preset };
    if (siteName) body.siteName = siteName;
    if (startDate) body.startDate = startDate;
    if (endDate) body.endDate = endDate;
    return {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
  }
  const trip: {
    siteName: string;
    startDate?: string;
    endDate?: string;
    dateLabel?: string;
  } = { siteName: siteName || UNTITLED_EVENT_TITLE };
  if (startDate) trip.startDate = startDate;
  if (endDate) trip.endDate = endDate;
  const dateLabel = formatDateLabel(startDate, endDate);
  if (dateLabel) trip.dateLabel = dateLabel;

  return {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      content: {
        kind: "trip",
        preset,
        presentation: { style: "clean" },
        trip,
        rsvp: { plusOnePolicy: "allowed" },
      },
    }),
  };
}

export function parseOrganizerPacket(body: unknown): OrganizerPacket | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  const url = rec.url;
  const slug = rec.slug;
  const password = rec.password;
  const adminToken = rec.adminToken;
  if (
    typeof url !== "string" ||
    typeof slug !== "string" ||
    typeof password !== "string" ||
    typeof adminToken !== "string" ||
    !url ||
    !slug ||
    !password ||
    !adminToken
  ) {
    return null;
  }
  return { url, slug, password, adminToken };
}

export function visitorSafeCreateError(status: number, body: unknown): string {
  if (status === 429) {
    return "Too many trips created just now. Try again in a few minutes.";
  }
  if (status === 503) {
    const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const error = typeof rec?.error === "string" ? rec.error : "";
    if (error === NOTES_UNAVAILABLE_MESSAGE || (/notes/i.test(error) && !ENV_NAME_RE.test(error))) {
      return error;
    }
    return "Couldn't create a trip right now. Try again in a minute.";
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const issues = Array.isArray(rec?.issues) ? rec.issues : [];
  const first = issues[0] as { hint?: unknown; message?: unknown } | undefined;
  const hint = typeof first?.hint === "string" ? first.hint : "";
  const message = typeof first?.message === "string" ? first.message : "";
  const error = typeof rec?.error === "string" ? rec.error : "";
  const candidate = hint || message || error;
  if (candidate && !ENV_NAME_RE.test(candidate)) return candidate;
  return "Couldn't create that trip.";
}

export async function createTripFromUi(
  fields: CreateTripFields,
  fetchImpl: typeof fetch = fetch,
): Promise<CreateTripResult> {
  const siteName = fields.siteName.trim();
  const plan = fields.plan?.trim();
  if (!siteName && !plan) return { ok: false, error: "Paste your notes." };
  if (isInvertedDateRange(fields.startDate, fields.endDate)) {
    return { ok: false, error: END_BEFORE_START_MESSAGE };
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      const error = new Error("This operation was aborted");
      error.name = "AbortError";
      reject(error);
    }, PLAN_EXTRACT_TIMEOUT_MS);
  });

  let request: Promise<Response>;
  try {
    request = Promise.resolve(
      fetchImpl(CREATE_TRIP_PATH, {
        ...createTripRequestInit({
          ...fields,
          siteName,
          plan,
          preset: parseEventPreset(fields.preset),
        }),
        signal: controller.signal,
      }),
    );
  } catch {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    return { ok: false, error: "Couldn't reach the server. Try again." };
  }
  void request.catch(() => {});

  let res: Response;
  try {
    res = await Promise.race([request, timeout]);
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, error: NOTES_UNAVAILABLE_MESSAGE };
    }
    return { ok: false, error: "Couldn't reach the server. Try again." };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.status === 201) {
    const packet = parseOrganizerPacket(body);
    if (!packet) return { ok: false, error: "Couldn't create that trip." };
    return { ok: true, packet };
  }

  return { ok: false, error: visitorSafeCreateError(res.status, body) };
}
