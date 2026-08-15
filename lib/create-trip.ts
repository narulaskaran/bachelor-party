import {
  END_BEFORE_START_MESSAGE,
  isInvertedDateRange,
} from "@/lib/trip-dates";

export { END_BEFORE_START_MESSAGE, isInvertedDateRange };

export type OrganizerPacket = {
  url: string;
  slug: string;
  password: string;
  adminToken: string;
};

export type CreateTripFields = {
  siteName: string;
  startDate?: string;
  endDate?: string;
};

export type CreateTripResult =
  | { ok: true; packet: OrganizerPacket }
  | { ok: false; error: string };

export const CREATE_TRIP_PATH = "/api/admin/trips";

const ENV_NAME_RE =
  /\b(ADMIN_UI_PASSWORD|ADMIN_API_TOKEN|DATABASE_URL|PARTY_PASSWORD)\b/;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function optionalDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Human date label from optional YYYY-MM-DD fields (UTC, so the picker day sticks). */
export function formatDateLabel(
  startDate?: string,
  endDate?: string,
): string | undefined {
  const start = optionalDate(startDate);
  const end = optionalDate(endDate);
  if (!start && !end) return undefined;
  const fmt = (iso: string) => {
    const match = ISO_DATE.exec(iso);
    if (!match) return iso;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  if (start && end && start !== end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start ?? end ?? "");
}

/** POST siteName (and optional dates) to the public create API. No Authorization. */
export function createTripRequestInit(fields: CreateTripFields): RequestInit {
  const siteName = fields.siteName.trim();
  const startDate = optionalDate(fields.startDate);
  const endDate = optionalDate(fields.endDate);
  const trip: {
    siteName: string;
    startDate?: string;
    endDate?: string;
    dateLabel?: string;
  } = { siteName };
  if (startDate) trip.startDate = startDate;
  if (endDate) trip.endDate = endDate;
  const dateLabel = formatDateLabel(startDate, endDate);
  if (dateLabel) trip.dateLabel = dateLabel;

  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: { trip } }),
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
  if (!siteName) return { ok: false, error: "Give the trip a name." };
  if (isInvertedDateRange(fields.startDate, fields.endDate)) {
    return { ok: false, error: END_BEFORE_START_MESSAGE };
  }

  let res: Response;
  try {
    res = await fetchImpl(
      CREATE_TRIP_PATH,
      createTripRequestInit({ ...fields, siteName }),
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
