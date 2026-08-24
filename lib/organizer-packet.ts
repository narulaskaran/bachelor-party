import { publishedGuestPath } from "@/lib/guest-invite";
import { publicOriginFromRequest } from "@/lib/invite-host";
import type { PartyContent } from "@/lib/party-types";

export function organizerPacket(
  request: Request,
  party: {
    slug: string;
    password: string;
    adminToken: string | null;
    content?: PartyContent;
    published?: boolean;
    guestToken?: string | null;
  },
) {
  const origin = publicOriginFromRequest(request);
  const published = party.published === true;
  return {
    url: `${origin}/${party.slug}/host`,
    hostUrl: `/${party.slug}/host`,
    guestUrl: published
      ? publishedGuestPath({ guestToken: party.guestToken, slug: party.slug })
      : null,
    slug: party.slug,
    password: party.password,
    adminToken: party.adminToken,
    published,
    ...(party.content
      ? { content: party.content, draftReview: party.content.draftReview ?? null }
      : {}),
  };
}

/** Invite + guest password only — never the host key. */
export function groupInviteText(packet: { url: string; password: string }): string {
  return `Here's the event:\n${packet.url}\nPassword: ${packet.password}`;
}
