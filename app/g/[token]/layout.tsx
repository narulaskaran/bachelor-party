import { SiteNav } from "@/components/site-nav";
import { guestInvitePath, isGuestInviteToken } from "@/lib/guest-invite";
import { resolvePartyByGuestToken } from "@/lib/resolve-party";
import { visibleSections } from "@/lib/trip-sections";

export default async function GuestInviteLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}>) {
  const { token } = await params;
  const normalized = token.toLowerCase();
  if (!isGuestInviteToken(normalized)) return children;

  let published: Awaited<ReturnType<typeof resolvePartyByGuestToken>> | null = null;
  try {
    const resolved = await resolvePartyByGuestToken(normalized);
    if (resolved.status === "published") published = resolved;
  } catch {
    published = null;
  }

  if (!published || published.status !== "published") return children;

  return (
    <>
      <SiteNav
        siteName={published.content.trip.siteName}
        dateLabel={published.content.trip.dateLabel}
        slug={published.slug}
        homeHref={guestInvitePath(published.guestToken)}
        sections={visibleSections(published.content)}
      />
      {children}
    </>
  );
}
