import { SiteNav } from "@/components/site-nav";
import { getCurrentParty } from "@/lib/current-party";
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
  // Cookie for trip A must not brand trip B's login gate (or /demo, 404, …).
  const tripChrome = current?.slug === slug ? current : null;

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
