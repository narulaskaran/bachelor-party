import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Trip, Lodging } from "@/lib/party-types";

export function BasecampSection({ trip, lodging }: { trip: Trip; lodging: Lodging }) {
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
    <section id="basecamp" className="scroll-mt-20 border-t border-border py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        The Basecamp
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        {lodging.name}
      </h2>
      {subtitle.length > 0 ? (
        <p className="mt-2 max-w-xl text-muted-foreground">{subtitle.join(" · ")}</p>
      ) : null}

      {facts.length > 0 ? (
        <div className="mt-8 flex divide-x divide-border overflow-x-auto border border-border">
          {facts.map((fact) => (
            <div key={fact.label} className="shrink-0 px-6 py-6 sm:flex-1 sm:px-8">
              <p className="font-mono text-3xl font-bold sm:text-4xl">{fact.value}</p>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {fact.label}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {(lodging.amenities?.length ?? 0) > 0 ? (
        <div className="mt-10">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            On Site
          </p>
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
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Getting There
          </p>
          <Card className="mt-4 max-w-xl">
            {lodging.address ? (
              <CardHeader>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Address
                </p>
                <CardTitle className="font-display text-lg font-bold tracking-wide">
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
              Cost split lands once headcount is final.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
