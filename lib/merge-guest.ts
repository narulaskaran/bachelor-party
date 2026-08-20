export const GUEST_TEXT_FIELDS = [
  "phone",
  "arrivalFlight",
  "arrivalTime",
  "departureFlight",
  "departureTime",
  "dietary",
  "notes",
] as const;

export type GuestTextField = (typeof GUEST_TEXT_FIELDS)[number];

/** Fields the RSVP form can prefill. Omits other guests' rows. */
export type RsvpPrefill = {
  name: string;
  nameKey: string;
  phone: string | null;
  arrivalFlight: string | null;
  arrivalTime: string | null;
  departureFlight: string | null;
  departureTime: string | null;
  dietary: string | null;
  notes: string | null;
  activityPrefs: Record<string, string> | null;
  attendanceStatus?: "attending" | "maybe" | "not-attending";
  partySize?: number;
  plusOneName?: string | null;
  /** Present on prefill rows so the form remounts after a save. */
  updatedAt?: Date | string | null;
};

export type GuestPatch = Omit<RsvpPrefill, "updatedAt"> & {
  partyId: number;
};

export function emptyToNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Legacy global session cookie. New writes use `rsvpCookieName(partyId)`. */
export const RSVP_COOKIE = "bp_rsvp";

const GUEST_TOKEN_RE = /^[a-f0-9]{32}$/;

/** Per-event identity cookie. Never a global last-name. */
export function rsvpCookieName(partyId: number): string {
  if (!Number.isInteger(partyId) || partyId < 1) return RSVP_COOKIE;
  return `${RSVP_COOKIE}_${partyId}`;
}

/** 32-char hex identity. Rejects leftover name-string cookies. */
export function readGuestToken(value: string | undefined | null): string | null {
  if (!value) return null;
  const token = value.trim().toLowerCase();
  return GUEST_TOKEN_RE.test(token) ? token : null;
}

type CookieReader = {
  get: (name: string) => { value: string } | undefined;
};

/** Identity saved for this event, if any. Does not read another trip's cookie. */
export function readScopedRsvpToken(
  store: CookieReader,
  partyId: number,
): string | null {
  return readGuestToken(store.get(rsvpCookieName(partyId))?.value);
}

export function rsvpFieldDefaults(existing: RsvpPrefill | null | undefined) {
  return {
    name: existing?.name ?? "",
    phone: existing?.phone ?? "",
    arrivalFlight: existing?.arrivalFlight ?? "",
    arrivalTime: existing?.arrivalTime ?? "",
    departureFlight: existing?.departureFlight ?? "",
    departureTime: existing?.departureTime ?? "",
    dietary: existing?.dietary ?? "",
    notes: existing?.notes ?? "",
    activityPrefs: existing?.activityPrefs ?? {},
    attendanceStatus: existing?.attendanceStatus ?? "attending",
    partySize: existing?.partySize ?? 1,
    plusOneName: existing?.plusOneName ?? "",
  };
}

export function explicitClearsFromFormData(formData: FormData): Set<GuestTextField> {
  const clears = new Set<GuestTextField>();
  // had:* is only rendered on a prefilled form for this browser's row.
  // Identity is the guest-token cookie, so a name edit still counts as
  // clearing this guest's fields — not someone else's.
  for (const field of GUEST_TEXT_FIELDS) {
    const raw = emptyToNull(formData.get(field));
    if (!raw && formData.get(`had:${field}`)) clears.add(field);
  }
  return clears;
}

/**
 * Merge an RSVP update into a previously saved row.
 * Empty/omitted text fields keep the stored value unless `explicitClears`
 * names that field (the prefilled form emptied a field that had a value).
 * Activity votes overlay by slug; unvoted slugs stay as they were.
 */
export function mergeGuestRow(
  existing: GuestPatch | null | undefined,
  incoming: GuestPatch,
  explicitClears: ReadonlySet<string> = new Set(),
): GuestPatch {
  if (!existing) return incoming;

  const merged: GuestPatch = {
    ...incoming,
    activityPrefs: {
      ...(existing.activityPrefs ?? {}),
      ...incoming.activityPrefs,
    },
  };

  for (const field of GUEST_TEXT_FIELDS) {
    const next = incoming[field];
    if (next != null && next !== "") continue;
    merged[field] = explicitClears.has(field) ? null : (existing[field] ?? null);
  }

  if (incoming.plusOneName !== undefined) merged.plusOneName = incoming.plusOneName;

  return merged;
}
