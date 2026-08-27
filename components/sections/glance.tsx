import type { Lodging, Trip } from "@/lib/party-types";
import { glanceFacts } from "@/lib/trip-sections";
import { kickerClass, sectionTitleClass } from "@/lib/type";
import { cn } from "@/lib/utils";

export function Glance({ trip, lodging }: { trip: Trip; lodging?: Lodging }) {
  const facts = glanceFacts(trip, lodging);
  if (facts.length === 0) return null;

  return (
    <section id="glance" className="scroll-mt-20 py-12 sm:py-16">
      <h2 className={sectionTitleClass}>At a glance</h2>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:gap-8">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0 flex-1">
            <p className={kickerClass}>{fact.label}</p>
            <p className="mt-1 break-words text-base font-medium sm:text-lg">{fact.value}</p>
            {fact.note && (
              <p className={cn("mt-0.5 break-words", kickerClass)}>{fact.note}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
