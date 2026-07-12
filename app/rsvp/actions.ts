"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { POLL_ACTIVITIES } from "@/lib/party";

const prefValues = ["hyped", "fine", "pass"] as const;

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
  const db = getDb();
  if (!db) {
    return {
      ok: false,
      error: "Database isn't hooked up yet — tell Kunal and try again later.",
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
  for (const activity of POLL_ACTIVITIES) {
    const value = String(formData.get(`pref:${activity.slug}`) ?? "");
    if ((prefValues as readonly string[]).includes(value)) {
      activityPrefs[activity.slug] = value;
    }
  }

  const data = parsed.data;
  const row = {
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

  try {
    await db
      .insert(schema.guests)
      .values(row)
      .onConflictDoUpdate({
        target: schema.guests.nameKey,
        set: { ...row, updatedAt: sql`now()` },
      });
  } catch (err) {
    console.error("submitGuestInfo failed", err);
    return { ok: false, error: "Couldn't save — try again in a minute." };
  }

  revalidatePath("/rsvp");
  return { ok: true };
}

export async function getGuests() {
  const db = getDb();
  if (!db) return [];
  try {
    return await db.select().from(schema.guests).orderBy(schema.guests.name);
  } catch (err) {
    console.error("getGuests failed", err);
    return [];
  }
}
