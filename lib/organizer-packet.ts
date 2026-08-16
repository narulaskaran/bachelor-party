import { publicOriginFromRequest } from "@/lib/invite-host";

export function organizerPacket(
  request: Request,
  party: { slug: string; password: string; adminToken: string | null },
) {
  return {
    url: `${publicOriginFromRequest(request)}/${party.slug}`,
    slug: party.slug,
    password: party.password,
    adminToken: party.adminToken,
  };
}

/** Invite + guest password only — never the host key. */
export function groupInviteText(packet: { url: string; password: string }): string {
  return `Here's the trip:\n${packet.url}\nPassword: ${packet.password}`;
}
