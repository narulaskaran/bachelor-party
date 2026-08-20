import type { GuestUpdate, Trip } from "@/lib/party-types";
import { Countdown } from "@/components/countdown";
import { formatGuestWhen, formatGuestWhere } from "@/lib/guest-when";
import { guestUpdateRelativeLabel } from "@/lib/guest-update";
import { pageTitleClass } from "@/lib/type";
import { cn } from "@/lib/utils";

export function Hero({
  trip,
  meta,
  guestUpdate,
}: {
  trip: Trip;
  meta?: string[];
  guestUpdate?: GuestUpdate;
}) {
  const when = formatGuestWhen(trip);
  const where = formatGuestWhere(trip);

  return (
    <section className="py-10 sm:py-14">
      <h1 className={cn(pageTitleClass, "break-words")}>{trip.siteName}</h1>
      {trip.tagline ? (
        <p className="mt-3 max-w-xl text-muted-foreground">{trip.tagline}</p>
      ) : null}

      <div className="mt-4 space-y-1 text-sm text-muted-foreground">
        <p>{when ?? "When TBD"}</p>
        {where.place || where.address || where.mapsUrl ? (
          <p className="break-words">
            {[where.place, where.address].filter(Boolean).join(" · ")}
            {where.mapsUrl ? (
              <>
                {where.place || where.address ? " " : null}
                <a href={where.mapsUrl} className="underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                  Map
                </a>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {meta && meta.length > 0 ? (
        <p className="mt-3 break-words text-sm text-muted-foreground">{meta.join(" · ")}</p>
      ) : null}

      {guestUpdate ? (
        <p className="mt-2 text-xs text-muted-foreground">{guestUpdateRelativeLabel(guestUpdate)}</p>
      ) : null}

      {trip.startDate ? (
        <div className="mt-4">
          <Countdown startDate={trip.startDate} timeZone={trip.timezone} />
        </div>
      ) : null}
    </section>
  );
}
