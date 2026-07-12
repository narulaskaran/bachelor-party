import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TRIP, LODGING } from "@/lib/party";

const FACTS = [
  { label: "Bedrooms", value: String(LODGING.bedrooms) },
  { label: "Beds", value: String(LODGING.beds) },
  { label: "Baths", value: String(LODGING.bathrooms) },
  { label: "Total cost", value: LODGING.totalCost },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="border-b border-border py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          The Basecamp
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide sm:text-7xl">
          Home in Tabernash
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          {TRIP.location} · {TRIP.elevation} · {LODGING.driveFromDen}
        </p>
      </section>

      {/* Fact plate */}
      <section className="flex divide-x divide-border overflow-x-auto border-b border-border">
        {FACTS.map((fact) => (
          <div key={fact.label} className="shrink-0 px-6 py-6 sm:flex-1 sm:px-8">
            <p className="font-mono text-3xl font-bold sm:text-4xl">{fact.value}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {fact.label}
            </p>
          </div>
        ))}
      </section>

      {/* Amenities */}
      <section className="border-b border-border py-12">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          On site
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide">
          Amenities
        </h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {LODGING.amenities.map((item) => (
            <Badge key={item} variant="outline" className="h-auto px-3 py-1.5 text-sm">
              {item}
            </Badge>
          ))}
        </div>
      </section>

      {/* Address / links */}
      <section className="py-12">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Getting there
        </p>
        <Card className="mt-4 max-w-xl">
          <CardHeader>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Address
            </p>
            <CardTitle className="font-display text-lg font-bold tracking-wide">
              {LODGING.address}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <a href={LODGING.mapsUrl} target="_blank" rel="noopener noreferrer">
                Open in Maps
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href={LODGING.url} target="_blank" rel="noopener noreferrer">
                Airbnb listing
              </a>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-sm text-muted-foreground">
          Cost split lands once headcount is final.
        </p>
      </section>
    </div>
  );
}
