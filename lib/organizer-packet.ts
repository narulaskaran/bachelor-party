import { publicOriginFromRequest } from "@/lib/invite-host";

export function organizerPacket(
  request: Request,
  party: { slug: string; password: string; adminToken: string | null },
) {
  const origin = publicOriginFromRequest(request);
  return {
    url: `${origin}/${party.slug}/host`,
    slug: party.slug,
    password: party.password,
    adminToken: party.adminToken,
  };
}

/** Invite + guest password only — never the host key. */
export function groupInviteText(packet: { url: string; password: string }): string {
  return `Here's the event:\n${packet.url}\nPassword: ${packet.password}`;
}
