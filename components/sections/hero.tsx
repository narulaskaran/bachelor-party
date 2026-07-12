import { Countdown } from "@/components/countdown";
import type { Trip } from "@/lib/party-types";

export function Hero({ trip }: { trip: Trip }) {
  return (
    <section className="py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Bachelor Expedition · Send-Off Weekend
      </p>
      <h1 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide sm:text-7xl">
        {trip.siteName}
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">{trip.tagline}</p>

      <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-b border-border py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <span>{trip.coordinates}</span>
        <span aria-hidden="true">·</span>
        <span>{trip.elevation}</span>
        <span aria-hidden="true">·</span>
        <span>{trip.dateLabel}</span>
      </div>

      <div className="mt-4">
        <Countdown startDate={trip.startDate} />
      </div>
    </section>
  );
}
