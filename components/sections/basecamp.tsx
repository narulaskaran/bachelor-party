import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Trip, Lodging } from "@/lib/party-types";

export function BasecampSection({ trip, lodging }: { trip: Trip; lodging: Lodging }) {
  const facts = [
    { label: "Bedrooms", value: String(lodging.bedrooms) },
    { label: "Beds", value: String(lodging.beds) },
    { label: "Baths", value: String(lodging.bathrooms) },
    { label: "Total cost", value: lodging.totalCost },
  ];

  return (
    <section id="basecamp" className="scroll-mt-20 border-t border-border py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        The Basecamp
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        {lodging.name}
      </h2>
      <p className="mt-2 max-w-xl text-muted-foreground">
        {trip.location} · {trip.elevation} · {lodging.driveFromAirport}
      </p>

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

      <div className="mt-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          On Site
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {lodging.amenities.map((item) => (
            <Badge key={item} variant="outline" className="h-auto px-3 py-1.5 text-sm">
              {item}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Getting There
        </p>
        <Card className="mt-4 max-w-xl">
          <CardHeader>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Address
            </p>
            <CardTitle className="font-display text-lg font-bold tracking-wide">
              {lodging.address}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <a href={lodging.mapsUrl} target="_blank" rel="noopener noreferrer">
                Open in Maps
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href={lodging.url} target="_blank" rel="noopener noreferrer">
                Airbnb listing
              </a>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-sm text-muted-foreground">
          Cost split lands once headcount is final.
        </p>
      </div>
    </section>
  );
}
