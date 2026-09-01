import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { EventPreset, Trip, Lodging } from "@/lib/party-types";
import { eventBlockLabel } from "@/lib/event-preset";
import { kickerClass, sectionTitleClass } from "@/lib/type";
import { cn } from "@/lib/utils";

export function BasecampSection({ trip, lodging, preset = "weekend" }: { trip: Trip; lodging: Lodging; preset?: EventPreset }) {
  const facts = [
    lodging.bedrooms != null && lodging.bedrooms > 0
      ? { label: "Bedrooms", value: String(lodging.bedrooms) }
      : null,
    lodging.beds != null && lodging.beds > 0
      ? { label: "Beds", value: String(lodging.beds) }
      : null,
    lodging.bathrooms != null && lodging.bathrooms > 0
      ? { label: "Baths", value: String(lodging.bathrooms) }
      : null,
    lodging.totalCost ? { label: "Total cost", value: lodging.totalCost } : null,
  ].filter((fact): fact is { label: string; value: string } => fact != null);

  const subtitle = [trip.location, trip.elevation, lodging.driveFromAirport].filter(Boolean);

  return (
    <section id="lodge" className="scroll-mt-20 py-10 sm:py-12">
      <h2 className={cn(sectionTitleClass, "break-words")}>
        {preset === "celebration" ? eventBlockLabel(preset, "lodging") : lodging.name}
      </h2>
      {preset === "celebration" ? <p className="mt-2 text-lg font-medium">{lodging.name}</p> : null}
      {subtitle.length > 0 ? (
        <p className="mt-2 max-w-xl text-muted-foreground">{subtitle.join(" · ")}</p>
      ) : null}

      {facts.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0 bg-background px-4 py-6 sm:px-8">
              <p
                className={cn(
                  "font-mono font-bold",
                  fact.label === "Total cost"
                    ? "break-words text-xl sm:text-2xl md:text-3xl"
                    : "break-words text-3xl sm:text-4xl",
                )}
              >
                {fact.value}
              </p>
              <p className={cn("mt-1 break-words", kickerClass)}>{fact.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {(lodging.amenities?.length ?? 0) > 0 ? (
        <div className="mt-10">
          <p className={kickerClass}>On site</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {lodging.amenities!.map((item) => (
              <Badge key={item} variant="outline" className="h-auto px-3 py-1.5 text-sm">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {lodging.address || lodging.mapsUrl || lodging.url ? (
        <div className="mt-10">
          <p className={kickerClass}>Getting there</p>
          <Card className="mt-4 max-w-xl border border-border">
            {lodging.address ? (
              <CardHeader>
                <p className={kickerClass}>Address</p>
                <CardTitle className="text-lg font-semibold tracking-tight">
                  {lodging.address}
                </CardTitle>
              </CardHeader>
            ) : null}
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              {lodging.mapsUrl ? (
                <Button asChild className="w-full sm:w-auto">
                  <a href={lodging.mapsUrl} target="_blank" rel="noopener noreferrer">
                    Open in Maps
                  </a>
                </Button>
              ) : null}
              {lodging.url ? (
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href={lodging.url} target="_blank" rel="noopener noreferrer">
                    Listing
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {lodging.totalCost ? (
            <p className="mt-6 text-sm text-muted-foreground">
              You&apos;ll get a request once we know who&apos;s coming.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
