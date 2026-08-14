"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getCurrentParty } from "@/lib/current-party";
import { pollActivities } from "@/lib/party-types";
import {
  RSVP_COOKIE,
  explicitClearsFromFormData,
  matchPrefillGuest,
  mergeGuestRow,
  type GuestPatch,
  type RsvpPrefill,
} from "@/lib/merge-guest";

const prefValues = ["hyped", "fine", "pass"] as const;

const NINETY_DAYS = 60 * 60 * 24 * 90;

const guestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  phone: z.string().trim().max(40).optional(),
  arrivalFlight: z.string().trim().max(40).optional(),
  arrivalTime: z.string().trim().max(80).optional(),
  departureFlight: z.string().trim().max(40).optional(),
  departureTime: z.string().trim().max(80).optional(),
  dietary: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type SubmitResult = {
  ok: boolean;
  error?: string;
};

export async function submitGuestInfo(
  _prev: SubmitResult | null,
  formData: FormData
): Promise<SubmitResult> {
  const current = await getCurrentParty();
  if (!current) {
    return { ok: false, error: "Session expired — refresh and log in again." };
  }

  const db = getDb();
  if (!db || current.partyId === "demo") {
    return {
      ok: false,
      error: "Demo mode — the database isn't connected, so nothing saves.",
    };
  }

  const parsed = guestSchema.safeParse({
    name: formData.get("name") ?? undefined,
    phone: formData.get("phone") || undefined,
    arrivalFlight: formData.get("arrivalFlight") || undefined,
    arrivalTime: formData.get("arrivalTime") || undefined,
    departureFlight: formData.get("departureFlight") || undefined,
    departureTime: formData.get("departureTime") || undefined,
    dietary: formData.get("dietary") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const activityPrefs: Record<string, string> = {};
  for (const activity of pollActivities(current.content)) {
    const value = String(formData.get(`pref:${activity.slug}`) ?? "");
    if ((prefValues as readonly string[]).includes(value)) {
      activityPrefs[activity.slug] = value;
    }
  }

  const data = parsed.data;
  const incoming: GuestPatch = {
    partyId: current.partyId,
    name: data.name,
    nameKey: data.name.toLowerCase(),
    phone: data.phone ?? null,
    arrivalFlight: data.arrivalFlight ?? null,
    arrivalTime: data.arrivalTime ?? null,
    departureFlight: data.departureFlight ?? null,
    departureTime: data.departureTime ?? null,
    dietary: data.dietary ?? null,
    notes: data.notes ?? null,
    activityPrefs,
  };
  const clears = explicitClearsFromFormData(formData);

  try {
    const [existing] = await db
      .select()
      .from(schema.guests)
      .where(
        and(
          eq(schema.guests.partyId, current.partyId),
          eq(schema.guests.nameKey, incoming.nameKey),
        ),
      )
      .limit(1);

    const existingPatch: GuestPatch | null = existing
      ? {
          partyId: existing.partyId,
          name: existing.name,
          nameKey: existing.nameKey,
          phone: existing.phone,
          arrivalFlight: existing.arrivalFlight,
          arrivalTime: existing.arrivalTime,
          departureFlight: existing.departureFlight,
          departureTime: existing.departureTime,
          dietary: existing.dietary,
          notes: existing.notes,
          activityPrefs: existing.activityPrefs,
        }
      : null;

    const row = mergeGuestRow(existingPatch, incoming, clears);

    if (existing) {
      await db
        .update(schema.guests)
        .set({ ...row, updatedAt: sql`now()` })
        .where(eq(schema.guests.id, existing.id));
    } else {
      await db
        .insert(schema.guests)
        .values(row)
        .onConflictDoUpdate({
          target: [schema.guests.partyId, schema.guests.nameKey],
          set: { ...row, updatedAt: sql`now()` },
        });
    }
  } catch (err) {
    console.error("submitGuestInfo failed", err);
    return { ok: false, error: "Couldn't save — try again in a minute." };
  }

  const cookieStore = await cookies();
  cookieStore.set(RSVP_COOKIE, incoming.nameKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: NINETY_DAYS,
    path: "/",
  });

  revalidatePath("/");
  revalidatePath(`/${current.slug}`);
  return { ok: true };
}

export async function getGuests() {
  const current = await getCurrentParty();
  const db = getDb();
  if (!current || !db || current.partyId === "demo") return [];
  try {
    return await db
      .select()
      .from(schema.guests)
      .where(and(eq(schema.guests.partyId, current.partyId)))
      .orderBy(schema.guests.name);
  } catch (err) {
    console.error("getGuests failed", err);
    return [];
  }
}

/** The guest this browser last saved, if they're on the roster. */
export async function getRsvpPrefill(
  guests: Awaited<ReturnType<typeof getGuests>>,
): Promise<RsvpPrefill | null> {
  const raw = (await cookies()).get(RSVP_COOKIE)?.value;
  const guest = matchPrefillGuest(guests, raw);
  if (!guest) return null;
  return {
    name: guest.name,
    nameKey: guest.nameKey,
    phone: guest.phone,
    arrivalFlight: guest.arrivalFlight,
    arrivalTime: guest.arrivalTime,
    departureFlight: guest.departureFlight,
    departureTime: guest.departureTime,
    dietary: guest.dietary,
    notes: guest.notes,
    activityPrefs: guest.activityPrefs,
    updatedAt: guest.updatedAt,
  };
}
