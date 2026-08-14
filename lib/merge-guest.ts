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

/** Session cookie: last name this browser saved an RSVP under. */
export const RSVP_COOKIE = "bp_rsvp";

export function matchPrefillGuest<T extends { nameKey: string }>(
  guests: T[],
  cookieValue: string | undefined | null,
): T | null {
  if (!cookieValue) return null;
  const key = cookieValue.trim().toLowerCase();
  if (!key) return null;
  return guests.find((guest) => guest.nameKey === key) ?? null;
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
  };
}

export function explicitClearsFromFormData(formData: FormData): Set<GuestTextField> {
  const clears = new Set<GuestTextField>();
  const prefillNameKey = emptyToNull(formData.get("prefillNameKey"))?.toLowerCase();
  const submittedName = emptyToNull(formData.get("name"))?.toLowerCase();
  // Only honor clears when the submitted name is the row we prefilled.
  // Changing the name is the #89 collision path — don't treat blanks as
  // deletes of someone else's saved fields.
  if (!prefillNameKey || prefillNameKey !== submittedName) return clears;

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

  return merged;
}
