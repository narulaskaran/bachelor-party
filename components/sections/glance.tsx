import type { Lodging, Trip } from "@/lib/party-types";
import { glanceFacts } from "@/lib/trip-sections";
import { kickerClass, sectionTitleClass } from "@/lib/type";

export function Glance({ trip, lodging }: { trip: Trip; lodging?: Lodging }) {
  const facts = glanceFacts(trip, lodging);
  if (facts.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <h2 className={sectionTitleClass}>At a glance</h2>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:gap-8">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0 flex-1">
            <p className={kickerClass}>{fact.label}</p>
            <p className="mt-1 break-words text-base font-medium sm:text-lg">{fact.value}</p>
            {fact.note && (
              <p className="mt-0.5 break-words text-xs text-muted-foreground">{fact.note}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
