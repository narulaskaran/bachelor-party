import type { Trip } from "@/lib/party-types";
import { Countdown } from "@/components/countdown";
import { pageTitleClass } from "@/lib/type";
import { cn } from "@/lib/utils";

export function Hero({ trip, meta }: { trip: Trip; meta: string[] }) {
  return (
    <section className="py-10 sm:py-14">
      <h1 className={cn(pageTitleClass, "break-words")}>{trip.siteName}</h1>
      {trip.tagline ? (
        <p className="mt-3 max-w-xl text-muted-foreground">{trip.tagline}</p>
      ) : null}

      {meta.length > 0 ? (
        <p className="mt-4 break-words text-sm text-muted-foreground">{meta.join(" · ")}</p>
      ) : null}

      {trip.startDate ? (
        <div className="mt-4">
          <Countdown startDate={trip.startDate} />
        </div>
      ) : null}
    </section>
  );
}
