import { Fragment } from "react";
import { Countdown } from "@/components/countdown";
import type { Trip } from "@/lib/party-types";

export function Hero({ trip, meta }: { trip: Trip; meta: string[] }) {
  return (
    <section className="py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Group Trip
      </p>
      <h1 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide sm:text-7xl">
        {trip.siteName}
      </h1>
      {trip.tagline ? (
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">{trip.tagline}</p>
      ) : null}

      {meta.length > 0 ? (
        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-b border-border py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {meta.map((part, index) => (
            <Fragment key={part}>
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <span>{part}</span>
            </Fragment>
          ))}
        </div>
      ) : null}

      {trip.startDate ? (
        <div className="mt-4">
          <Countdown startDate={trip.startDate} />
        </div>
      ) : null}
    </section>
  );
}
