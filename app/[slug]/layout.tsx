import { SiteNav } from "@/components/site-nav";
import { getCurrentParty } from "@/lib/current-party";
import { resolvePartyBySlug } from "@/lib/resolve-party";
import { visibleSections } from "@/lib/trip-sections";

export default async function TripLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const current = await getCurrentParty();
  // Cookie for trip A must not brand trip B's login gate (or 404, …).
  let tripChrome = current?.slug === slug ? current : null;

  if (!tripChrome) {
    try {
      const resolved = await resolvePartyBySlug(slug);
      // Open sample trips (always /demo) get in-page nav without a cookie.
      if (resolved.status === "open") {
        tripChrome = { partyId: "demo", slug, content: resolved.content };
      }
    } catch {
      // Lookup failed — keep marketing chrome.
    }
  }

  return (
    <>
      {tripChrome ? (
        <SiteNav
          siteName={tripChrome.content.trip.siteName}
          dateLabel={tripChrome.content.trip.dateLabel}
          slug={tripChrome.slug}
          sections={visibleSections(tripChrome.content)}
        />
      ) : null}
      {children}
    </>
  );
}
