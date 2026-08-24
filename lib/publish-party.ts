import { eq } from "drizzle-orm";
import { recordContentVersion } from "@/lib/content-versions";
import { getDb, schema } from "@/lib/db";
import { draftForParty } from "@/lib/draft-publish";
import { publishedGuestPath } from "@/lib/guest-invite";
import { guestUpdateForPublish } from "@/lib/guest-update";
import { parsePartyContentForExisting } from "@/lib/party-schema";
import type { PartyContent } from "@/lib/party-types";
import { reviewComplete, stripDraftReview } from "@/lib/plan-ingestion";

type Db = NonNullable<ReturnType<typeof getDb>>;

export type PublishableParty = {
  id: number;
  slug: string;
  content: PartyContent;
  draftContent?: PartyContent | null;
  published: boolean | null;
  guestToken?: string | null;
};

export type PreparedPublish =
  | { ok: true; reviewedDraft: PartyContent; publishedContent: PartyContent }
  | { ok: false; error: string };

export function preparePublish(party: PublishableParty): PreparedPublish {
  const next = draftForParty({
    content: party.content,
    draftContent: party.draftContent,
    published: party.published === true,
  });
  if (next.draftReview && !reviewComplete(next.draftReview)) {
    return {
      ok: false,
      error: "Review every fact and confirm that no logistics were guessed before publishing.",
    };
  }
  const parsed = parsePartyContentForExisting(next, next);
  if (!parsed.success) {
    return { ok: false, error: "Fix the draft before publishing." };
  }
  const reviewedDraft = { ...parsed.data, kind: "trip" as const };
  const publishedContent = {
    ...stripDraftReview(reviewedDraft),
    guestUpdate: guestUpdateForPublish(
      party.content,
      reviewedDraft,
      party.published !== false,
    ),
  };
  return { ok: true, reviewedDraft, publishedContent };
}

export async function persistPublishedParty(
  db: Db,
  party: PublishableParty,
  prepared: Extract<PreparedPublish, { ok: true }>,
  actor: { actorType: "host" | "admin"; actorId?: string },
): Promise<string> {
  await db
    .update(schema.parties)
    .set({
      content: prepared.publishedContent,
      draftContent: prepared.reviewedDraft,
      published: true,
      updatedAt: new Date(),
    })
    .where(eq(schema.parties.slug, party.slug));
  await recordContentVersion(db, {
    partyId: party.id,
    state: "published",
    content: prepared.publishedContent,
    actorType: actor.actorType,
    ...(actor.actorId ? { actorId: actor.actorId } : {}),
    changeSummary: "draft published",
    publishedAt: new Date(),
  });
  return publishedGuestPath({ guestToken: party.guestToken, slug: party.slug });
}
