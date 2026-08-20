import {
  END_BEFORE_START_MESSAGE,
  formatDateLabel,
  isInvertedDateRange,
  optionalDate,
} from "@/lib/trip-dates";
import { parseEventPreset, type EventPreset } from "@/lib/event-preset";
import { ingestEventPlan } from "@/lib/plan-ingestion";
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
  /\b(ADMIN_UI_PASSWORD|ADMIN_API_TOKEN|DATABASE_URL|PARTY_PASSWORD)\b/;

/** POST siteName (and optional dates) to the public create API. No Authorization. */
export function createTripRequestInit(fields: CreateTripFields): RequestInit {
  const siteName = fields.siteName.trim();
  const plan = fields.plan?.trim();
  const startDate = optionalDate(fields.startDate);
  const endDate = optionalDate(fields.endDate);
  const preset = parseEventPreset(fields.preset);
  const slug = fields.slug?.trim() || unguessableEventSlug();
  if (plan) {
    const ingested = ingestEventPlan(plan, { siteName, startDate, endDate, preset });
    return {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, content: ingested.content }),
    };
  }
  const trip: {
    siteName: string;
    startDate?: string;
    endDate?: string;
    dateLabel?: string;
  } = { siteName: siteName || "Untitled event" };
  if (startDate) trip.startDate = startDate;
  if (endDate) trip.endDate = endDate;
  const dateLabel = formatDateLabel(startDate, endDate);
  if (dateLabel) trip.dateLabel = dateLabel;

  return {
    method: "POST",
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

  let res: Response;
  try {
    res = await fetchImpl(
      CREATE_TRIP_PATH,
      createTripRequestInit({ ...fields, siteName, plan, preset: parseEventPreset(fields.preset) }),
    );
  } catch {
    return { ok: false, error: "Couldn't reach the server. Try again." };
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
