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
