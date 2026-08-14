import { SiteNav } from "@/components/site-nav";
import { getCurrentParty } from "@/lib/current-party";
import { visibleSections } from "@/lib/trip-sections";

export default async function TripLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const current = await getCurrentParty();

  return (
    <>
      {current ? (
        <SiteNav
          siteName={current.content.trip.siteName}
          dateLabel={current.content.trip.dateLabel}
          slug={current.slug}
          sections={visibleSections(current.content)}
        />
      ) : null}
      {children}
    </>
  );
}
