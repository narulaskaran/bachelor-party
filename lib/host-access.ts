"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { DEMO_PARTY } from "@/lib/demo-party";
import { draftForParty, hostPublishStatus, preserveScheduleKeyEvents, type HostPublishStatus } from "@/lib/draft-publish";
import { publishedGuestPath } from "@/lib/guest-invite";
import { constantTimeEqual } from "@/lib/cookie-hash";
import { recordContentVersion } from "@/lib/content-versions";
import { persistPublishedParty, preparePublish } from "@/lib/publish-party";
import { cookieAuthenticatesHost, HOST_COOKIE, WRONG_HOST_KEY, hostSessionCookie } from "@/lib/host-auth";
import { setDayKeyEvent } from "@/lib/key-events";
import { parsePartyContentForExisting } from "@/lib/party-schema";
import {
  organizerVisibleRoster,
  type OrganizerVisibleRosterEntry,
} from "@/lib/roster-visibility";
import type { ScheduleDay } from "@/lib/party-types";

export type SetKeyEventResult =
  | { ok: true; schedule: ScheduleDay[] }
  | { ok: false; error: string };

async function setHostAccessCookie(partyId: number, adminToken: string) {
  const cookieStore = await cookies();
  const { name, value, ...options } = await hostSessionCookie(partyId, adminToken);
  cookieStore.set(name, value, options);
}

/** Persist the trip-scoped host cookie. Never log the key. */
export async function establishHostSession(
  slug: string,
  hostKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const attempt = hostKey.trim();
  if (!attempt) return { ok: false, error: "Enter the host key." };
  if (slug === "demo") return { ok: true };

  const db = getDb();
  if (!db) {
    return { ok: false, error: "Couldn't check that — try again in a minute." };
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
    return { ok: false, error: "Couldn't check that — try again in a minute." };
  }

  if (!party?.adminToken || !constantTimeEqual(attempt, party.adminToken)) {
    return { ok: false, error: WRONG_HOST_KEY };
  }

  await setHostAccessCookie(party.id, party.adminToken);
  return { ok: true };
}

/** Set the host cookie and send them to the host workspace. */
export async function unlockHostTrip(
  slug: string,
  hostKey: string,
): Promise<{ error?: string }> {
  if (slug === "demo") {
    redirect("/demo/host");
  }
  const established = await establishHostSession(slug, hostKey);
  if (!established.ok) return { error: established.error };
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
      guestToken: schema.parties.guestToken,
      content: schema.parties.content,
      draftContent: schema.parties.draftContent,
      published: schema.parties.published,
    })
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);

  if (!party) return { status: "missing" as const };
  return { status: "ok" as const, db, party };
}

export type HostEditorState =
  | {
      ok: true;
      content: import("@/lib/party-types").PartyContent;
      published: boolean;
      publishStatus: HostPublishStatus;
      sample: boolean;
      guestUrl?: string;
      publishedSnapshot?: import("@/lib/party-types").PartyContent;
    }
  | { ok: false; error: string };

export async function getHostEditorState(slug: string): Promise<HostEditorState> {
  if (slug === "demo") {
    return {
      ok: true,
      content: DEMO_PARTY,
      published: true,
      publishStatus: "live",
      sample: true,
      guestUrl: "/demo",
      publishedSnapshot: DEMO_PARTY,
    };
  }
  const loaded = await loadHostParty(slug);
  if (loaded.status === "unavailable") return { ok: false, error: "Database unavailable." };
  if (loaded.status !== "ok" || !loaded.party.adminToken) return { ok: false, error: "Trip not found." };
  if (!(await hostCookieMatches(loaded.party))) {
    return { ok: false, error: WRONG_HOST_KEY };
  }
  const published = loaded.party.published !== false;
  return {
    ok: true,
    content: draftForParty(loaded.party),
    published,
    publishStatus: hostPublishStatus({
      content: loaded.party.content,
      draftContent: loaded.party.draftContent,
      published,
    }),
    sample: false,
    ...(published
      ? {
          guestUrl: publishedGuestPath(loaded.party),
          publishedSnapshot: loaded.party.content,
        }
      : {}),
  };
}

async function hostCookieMatches(party: { id: number; adminToken: string | null }) {
  if (!party.adminToken) return false;
  const raw = (await cookies()).get(HOST_COOKIE)?.value;
  return cookieAuthenticatesHost(raw, party.id, party.adminToken);
}

async function authenticatedHostParty(slug: string) {
  const loaded = await loadHostParty(slug);
  if (loaded.status !== "ok" || !(await hostCookieMatches(loaded.party))) {
    return { ok: false as const, error: WRONG_HOST_KEY };
  }
  return { ok: true as const, loaded };
}

async function authenticateHostParty(slug: string, hostKey?: string) {
  const auth = await authenticatedHostParty(slug);
  if (auth.ok || !hostKey) return auth;
  const established = await establishHostSession(slug, hostKey);
  if (!established.ok) return { ok: false as const, error: established.error };
  return authenticatedHostParty(slug);
}

export async function saveHostDraft(
  slug: string,
  content: import("@/lib/party-types").PartyContent,
  preserveExistingKeyEvents = true,
  hostKey?: string,
) {
  if (slug === "demo") return { ok: false as const, error: "The sample trip does not save drafts." };
  const auth = await authenticateHostParty(slug, hostKey);
  if (!auth.ok) return auth;
  const previous = draftForParty(auth.loaded.party);
  const contentToSave = {
    ...content,
    rsvp: previous.rsvp || content.rsvp
      ? { ...previous.rsvp, ...content.rsvp }
      : undefined,
    schedule: preserveExistingKeyEvents
      ? preserveScheduleKeyEvents(previous.schedule, content.schedule)
      : content.schedule,
  };
  const parsed = parsePartyContentForExisting(contentToSave, previous);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Fix the highlighted fields." };
  try {
    const next = { ...parsed.data, kind: "trip" as const };
    await auth.loaded.db
      .update(schema.parties)
      .set({ draftContent: next, updatedAt: new Date() })
      .where(eq(schema.parties.slug, slug));
    await recordContentVersion(auth.loaded.db, {
      partyId: auth.loaded.party.id,
      state: "draft",
      content: next,
      actorType: "host",
      changeSummary: "draft saved",
    });
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/host`);
    return { ok: true as const, content: next };
  } catch (err) {
    console.error("saveHostDraft failed", err);
    return { ok: false as const, error: "Couldn't save that draft — try again in a minute." };
  }
}

export async function publishHostDraft(slug: string, hostKey?: string) {
  if (slug === "demo") return { ok: false as const, error: "The sample trip cannot be published." };
  const auth = await authenticateHostParty(slug, hostKey);
  if (!auth.ok) return auth;
  const prepared = preparePublish(auth.loaded.party);
  if (!prepared.ok) return { ok: false as const, error: prepared.error };
  try {
    const guestUrl = await persistPublishedParty(auth.loaded.db, auth.loaded.party, prepared, {
      actorType: "host",
    });
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/host`);
    return { ok: true as const, guestUrl };
  } catch (err) {
    console.error("publishHostDraft failed", err);
    return { ok: false as const, error: "Couldn't publish that trip — try again in a minute." };
  }
}

export async function hostSessionForSlug(slug: string): Promise<boolean> {
  if (slug === "demo") return true;
  const loaded = await loadHostParty(slug);
  if (loaded.status !== "ok") return false;
  return hostCookieMatches(loaded.party);
}

/** Read the organizer-only roster after verifying the host cookie. */
export async function getHostGuests(
  slug: string,
): Promise<OrganizerVisibleRosterEntry[]> {
  const auth = await authenticatedHostParty(slug);
  if (!auth.ok) return [];

  try {
    const guests = await auth.loaded.db
      .select({
        id: schema.guests.id,
        name: schema.guests.name,
        attendanceStatus: schema.guests.attendanceStatus,
        partySize: schema.guests.partySize,
        plusOneName: schema.guests.plusOneName,
        phone: schema.guests.phone,
        arrivalFlight: schema.guests.arrivalFlight,
        arrivalTime: schema.guests.arrivalTime,
        departureFlight: schema.guests.departureFlight,
        departureTime: schema.guests.departureTime,
        dietary: schema.guests.dietary,
      })
      .from(schema.guests)
      .where(eq(schema.guests.partyId, auth.loaded.party.id))
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
  if (loaded.status !== "ok" || !(await hostCookieMatches(loaded.party))) {
    return { ok: false, error: WRONG_HOST_KEY };
  }

  const editable = draftForParty(loaded.party);
  const schedule = editable.schedule ?? [];
  const next = setDayKeyEvent(schedule, dayKey, entryIndex, key);
  if (!next.ok) return { ok: false, error: next.error };

  const parsed = parsePartyContentForExisting({
    ...editable,
    schedule: next.schedule,
  }, editable);
  if (!parsed.success) {
    return { ok: false, error: "Couldn't save those key events." };
  }

  try {
    const nextContent = { ...parsed.data, kind: "trip" as const };
    const update: { draftContent: typeof nextContent; content?: typeof nextContent; updatedAt: Date } = {
      draftContent: nextContent,
      updatedAt: new Date(),
    };
    // Legacy rows have no draft column yet; keep their historical picker behavior
    // while establishing a draft snapshot for all future edits.
    if (loaded.party.draftContent == null) update.content = nextContent;
    await loaded.db
      .update(schema.parties)
      .set(update)
      .where(eq(schema.parties.slug, slug));
  } catch (err) {
    console.error("setScheduleKeyEvent failed", err);
    return { ok: false, error: "Couldn't save that — try again in a minute." };
  }

  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/host`);
  return { ok: true, schedule: parsed.data.schedule ?? next.schedule };
}

