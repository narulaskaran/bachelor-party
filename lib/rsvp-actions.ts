"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getCurrentParty } from "@/lib/current-party";
import { DEMO_RSVP_MESSAGE } from "@/lib/demo-party";
import { pollActivities } from "@/lib/party-types";
import {
  RSVP_COOKIE,
  explicitClearsFromFormData,
  matchPrefillGuest,
  mergeGuestRow,
  readGuestToken,
  type GuestPatch,
  type RsvpPrefill,
} from "@/lib/merge-guest";

const prefValues = ["hyped", "fine", "pass"] as const;

const NINETY_DAYS = 60 * 60 * 24 * 90;

function newGuestToken(): string {
  return randomBytes(16).toString("hex");
}

function toGuestPatch(row: {
  partyId: number;
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
}): GuestPatch {
  return {
    partyId: row.partyId,
    name: row.name,
    nameKey: row.nameKey,
    phone: row.phone,
    arrivalFlight: row.arrivalFlight,
    arrivalTime: row.arrivalTime,
    departureFlight: row.departureFlight,
    departureTime: row.departureTime,
    dietary: row.dietary,
    notes: row.notes,
    activityPrefs: row.activityPrefs,
  };
}

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

/** Lives in a "use server" file, so this must be async. */
async function sampleTripRsvpResult(): Promise<SubmitResult> {
  return { ok: false, error: DEMO_RSVP_MESSAGE };
}

export async function submitSampleGuestInfo(): Promise<SubmitResult> {
  return await sampleTripRsvpResult();
}

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
    return await sampleTripRsvpResult();
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

  const cookieStore = await cookies();
  const cookieToken = readGuestToken(cookieStore.get(RSVP_COOKIE)?.value);
  const guestToken = cookieToken ?? newGuestToken();
  const clears = explicitClearsFromFormData(formData);

  try {
    // Identity is the cookie token, never the display name. Same name from
    // another browser inserts a distinct row instead of clobbering.
    const [existing] = cookieToken
      ? await db
          .select()
          .from(schema.guests)
          .where(
            and(
              eq(schema.guests.partyId, current.partyId),
              eq(schema.guests.guestToken, cookieToken),
            ),
          )
          .limit(1)
      : [];

    const row = mergeGuestRow(
      existing ? toGuestPatch(existing) : null,
      incoming,
      existing ? clears : new Set(),
    );

    if (existing) {
      await db
        .update(schema.guests)
        .set({ ...row, updatedAt: sql`now()` })
        .where(eq(schema.guests.id, existing.id));
    } else {
      await db.insert(schema.guests).values({ ...row, guestToken });
    }
  } catch (err) {
    console.error("submitGuestInfo failed", err);
    return { ok: false, error: "Couldn't save — try again in a minute." };
  }

  cookieStore.set(RSVP_COOKIE, guestToken, {
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
