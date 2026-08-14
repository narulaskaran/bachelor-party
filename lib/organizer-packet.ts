export function organizerPacket(
  request: Request,
  party: { slug: string; password: string; adminToken: string | null },
) {
  const url = new URL(request.url);
  return {
    url: `${url.origin}/${party.slug}`,
    slug: party.slug,
    password: party.password,
    adminToken: party.adminToken,
  };
}
