import { draftForParty } from "@/lib/draft-publish";
import { publishedGuestPath } from "@/lib/guest-invite";
import type { PartyContent } from "@/lib/party-types";

type PartyRow = {
  slug: string;
  content: PartyContent;
  draftContent?: PartyContent | null;
  published: boolean | null;
  guestToken?: string | null;
};

/** Admin JSON: working draft as `content`, guest URL only after publish. */
export function adminPartyView<T extends PartyRow>(party: T) {
  const published = party.published === true;
  const content = draftForParty({
    content: party.content,
    draftContent: party.draftContent,
    published,
  });
  return {
    ...party,
    content,
    published,
    hostUrl: `/${party.slug}/host`,
    guestUrl: published
      ? publishedGuestPath({ guestToken: party.guestToken, slug: party.slug })
      : null,
    guestToken: published ? party.guestToken : null,
  };
}
