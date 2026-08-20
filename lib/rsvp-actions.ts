"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getCurrentParty, partyFromGuestInvite, type CurrentParty } from "@/lib/current-party";
import { DEMO_RSVP_MESSAGE } from "@/lib/demo-party";
import { sessionCookieOptions } from "@/lib/cookie-hash";
import { pollActivities } from "@/lib/party-types";
import {
  parseRsvpSubmission,
  type RsvpAttendance,
} from "@/lib/rsvp-contract";
import {
  explicitClearsFromFormData,
  mergeGuestRow,
  rsvpCookieName,
  type GuestPatch,
} from "@/lib/merge-guest";
import { findGuestByToken, rsvpIdentityToken } from "@/lib/rsvp-identity";

const prefValues = ["hyped", "fine", "pass"] as const;

function newGuestToken(): string {
  return randomBytes(16).toString("hex");
}

async function partyForRsvp(inviteRaw: FormDataEntryValue | null): Promise<CurrentParty | null> {
  if (typeof inviteRaw === "string" && inviteRaw.trim()) {
    return partyFromGuestInvite(inviteRaw);
  }
  return getCurrentParty();
}

function toGuestPatch(row: {
  partyId: number;
  name: string;
  nameKey: string;
  attendanceStatus: RsvpAttendance;
  partySize: number;
  plusOneName: string | null;
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
    attendanceStatus: row.attendanceStatus,
    partySize: row.partySize,
    plusOneName: row.plusOneName,
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
  attendance: z.string().optional(),
  partySize: z.string().optional(),
  plusOneCount: z.string().optional(),
  plusOneName: z.string().trim().max(80).optional(),
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

export async function submitSampleGuestInfo(): Promise<SubmitResult> {
  return { ok: false, error: DEMO_RSVP_MESSAGE };
}

export async function submitGuestInfo(
  _prev: SubmitResult | null,
  formData: FormData
): Promise<SubmitResult> {
  const current = await partyForRsvp(formData.get("invite"));
  if (!current) {
    return { ok: false, error: "Session expired — refresh and log in again." };
  }

  const db = getDb();
  if (!db || current.partyId === "demo") {
    return { ok: false, error: DEMO_RSVP_MESSAGE };
  }

  const parsed = guestSchema.safeParse({
    name: formData.get("name") ?? undefined,
    attendance: formData.get("attendance") ?? undefined,
    partySize: formData.get("partySize") ?? undefined,
    plusOneCount: formData.get("plusOneCount") ?? undefined,
    plusOneName: formData.get("plusOneName") || undefined,
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

  const rsvp = parseRsvpSubmission(
    {
      attendance: parsed.data.attendance,
      partySize: parsed.data.partySize,
      plusOneCount: parsed.data.plusOneCount,
      plusOneName: parsed.data.plusOneName,
    },
    current.content.rsvp,
  );
  if (!rsvp.ok) return rsvp;

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
    attendanceStatus: rsvp.value.attendanceStatus,
    partySize: rsvp.value.partySize,
    plusOneName: rsvp.value.plusOneName,
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
  const cookieToken = await rsvpIdentityToken(db, current.partyId, cookieStore);
  const guestToken = cookieToken ?? newGuestToken();
  const clears = explicitClearsFromFormData(formData);

  try {
    // Identity is the cookie token, never the display name. Same name from
    // another browser inserts a distinct row instead of clobbering.
    const existing = cookieToken
      ? await findGuestByToken(db, current.partyId, cookieToken)
      : undefined;

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

  cookieStore.set(rsvpCookieName(current.partyId), guestToken, sessionCookieOptions());

  revalidatePath("/");
  revalidatePath(`/${current.slug}`);
  revalidatePath(`/${current.slug}/host`);
  if (current.guestPath) revalidatePath(current.guestPath);
  return { ok: true };
}
