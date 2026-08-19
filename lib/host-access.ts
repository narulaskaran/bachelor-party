"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { cookieAuthenticatesHost, HOST_COOKIE, hostCookieValue } from "@/lib/host-auth";
import { setDayKeyEvent } from "@/lib/key-events";
import { partyContentSchema } from "@/lib/party-schema";
import {
  organizerVisibleRoster,
  type OrganizerVisibleRosterEntry,
} from "@/lib/roster-visibility";
import type { ScheduleDay } from "@/lib/party-types";

const NINETY_DAYS = 60 * 60 * 24 * 90;

const WRONG_HOST_KEY = "Wrong host key. It's in the organizer packet — not the guest password.";

export type SetKeyEventResult =
  | { ok: true; schedule: ScheduleDay[] }
  | { ok: false; error: string };

async function setHostAccessCookie(partyId: number, adminToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(HOST_COOKIE, await hostCookieValue(partyId, adminToken), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: NINETY_DAYS,
    path: "/",
  });
}

/** Set the host cookie and send them to the key-event picker. */
export async function unlockHostTrip(
  slug: string,
  hostKey: string,
): Promise<{ error?: string }> {
  const attempt = hostKey.trim();
  if (!attempt) return { error: "Enter the host key." };

  if (slug === "demo") {
    redirect("/demo/host");
  }

  const db = getDb();
  if (!db) {
    return { error: "Couldn't check that — try again in a minute." };
  }

  let party: {
    id: number;
    adminToken: string | null;
  } | undefined;
  try {
    const [row] = await db
      .select({
        id: schema.parties.id,
        adminToken: schema.parties.adminToken,
      })
      .from(schema.parties)
      .where(eq(schema.parties.slug, slug))
      .limit(1);
    party = row;
  } catch (err) {
    console.error("host unlock lookup failed", err);
    return { error: "Couldn't check that — try again in a minute." };
  }

  if (!party?.adminToken || attempt !== party.adminToken) {
    return { error: WRONG_HOST_KEY };
  }

  await setHostAccessCookie(party.id, party.adminToken);
  redirect(`/${slug}/host`);
}

/** Form action from the organizer packet: open the key-event picker. */
export async function openAsHost(slug: string, adminToken: string) {
  return unlockHostTrip(slug, adminToken);
}

async function loadHostParty(slug: string) {
  if (slug === "demo") return { status: "sample" as const };

  const db = getDb();
  if (!db) return { status: "unavailable" as const };

  const [party] = await db
    .select({
      id: schema.parties.id,
      slug: schema.parties.slug,
      adminToken: schema.parties.adminToken,
      content: schema.parties.content,
    })
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);

  if (!party) return { status: "missing" as const };
  return { status: "ok" as const, db, party };
}

export async function hostSessionForSlug(slug: string): Promise<boolean> {
  if (slug === "demo") return true;
  const loaded = await loadHostParty(slug);
  if (loaded.status !== "ok" || !loaded.party.adminToken) return false;
  const raw = (await cookies()).get(HOST_COOKIE)?.value;
  return cookieAuthenticatesHost(raw, loaded.party.id, loaded.party.adminToken);
}

/** Read the organizer-only roster after verifying the host cookie. */
export async function getHostGuests(
  slug: string,
): Promise<OrganizerVisibleRosterEntry[]> {
  const loaded = await loadHostParty(slug);
  if (loaded.status !== "ok" || !loaded.party.adminToken) return [];

  const raw = (await cookies()).get(HOST_COOKIE)?.value;
  if (!(await cookieAuthenticatesHost(raw, loaded.party.id, loaded.party.adminToken))) {
    return [];
  }

  try {
    const guests = await loaded.db
      .select()
      .from(schema.guests)
      .where(eq(schema.guests.partyId, loaded.party.id))
      .orderBy(schema.guests.name);
    return organizerVisibleRoster(guests);
  } catch (err) {
    console.error("getHostGuests failed", err);
    return [];
  }
}

export async function setScheduleKeyEvent(
  slug: string,
  dayKey: string,
  entryIndex: number,
  key: boolean,
): Promise<SetKeyEventResult> {
  if (slug === "demo") {
    return { ok: false, error: "The sample trip doesn't save key events." };
  }

  const loaded = await loadHostParty(slug);
  if (loaded.status === "unavailable") {
    return { ok: false, error: "Couldn't save that — try again in a minute." };
  }
  if (loaded.status !== "ok" || !loaded.party.adminToken) {
    return { ok: false, error: WRONG_HOST_KEY };
  }

  const raw = (await cookies()).get(HOST_COOKIE)?.value;
  if (!(await cookieAuthenticatesHost(raw, loaded.party.id, loaded.party.adminToken))) {
    return { ok: false, error: WRONG_HOST_KEY };
  }

  const schedule = loaded.party.content.schedule ?? [];
  const next = setDayKeyEvent(schedule, dayKey, entryIndex, key);
  if (!next.ok) return { ok: false, error: next.error };

  const parsed = partyContentSchema.safeParse({
    ...loaded.party.content,
    schedule: next.schedule,
  });
  if (!parsed.success) {
    return { ok: false, error: "Couldn't save those key events." };
  }

  try {
    await loaded.db
      .update(schema.parties)
      .set({
        content: { ...parsed.data, kind: "trip" },
        updatedAt: new Date(),
      })
      .where(eq(schema.parties.slug, slug));
  } catch (err) {
    console.error("setScheduleKeyEvent failed", err);
    return { ok: false, error: "Couldn't save that — try again in a minute." };
  }

  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/host`);
  return { ok: true, schedule: parsed.data.schedule ?? next.schedule };
}

