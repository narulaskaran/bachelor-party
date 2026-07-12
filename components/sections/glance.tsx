import type { Trip, Lodging } from "@/lib/party-types";

export function Glance({ trip, lodging }: { trip: Trip; lodging: Lodging }) {
  const facts = [
    { label: "When", value: trip.dateLabel },
    { label: "Where", value: trip.location, note: `Fly into ${trip.airport}` },
    {
      label: "Sleeps",
      value: `${lodging.bedrooms}BR · ${lodging.beds} beds`,
      note: `${lodging.bathrooms} baths`,
    },
    { label: "Damage", value: lodging.totalCost, note: "split by headcount" },
  ];

  return (
    <section className="border-t border-border py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        At a Glance
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        The Short Version
      </h2>

      <div className="mt-6 grid grid-cols-1 divide-y divide-border border border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {fact.label}
            </p>
            <p className="mt-1 font-mono text-base font-bold sm:text-lg">{fact.value}</p>
            {fact.note && (
              <p className="mt-0.5 text-xs text-muted-foreground">{fact.note}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
