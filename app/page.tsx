import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Countdown } from "@/components/countdown";
import { TRIP, LODGING } from "@/lib/party";

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="border-b border-border py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Est. 2026 · Bachelor Expedition
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide sm:text-7xl">
          {TRIP.groomName}&rsquo;s Last Ride
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">{TRIP.tagline}</p>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-b border-border py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          <span>{TRIP.coordinates}</span>
          <span aria-hidden="true">·</span>
          <span>{TRIP.elevation}</span>
          <span aria-hidden="true">·</span>
          <span>{TRIP.dateLabel}</span>
        </div>

        <div className="mt-4">
          <Countdown targetDate={TRIP.startDate} />
        </div>
      </section>

      {/* Quick-glance grid */}
      <section className="grid grid-cols-1 gap-4 py-12 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Friday
            </p>
            <CardTitle className="font-display text-xl font-bold uppercase tracking-wide">
              Fly in
            </CardTitle>
            <CardDescription>
              Arrivals into {TRIP.airport} through Friday morning. Rental cars and a
              Costco run before we head for the hills.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/schedule"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Full schedule &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {TRIP.location}
            </p>
            <CardTitle className="font-display text-xl font-bold uppercase tracking-wide">
              Basecamp
            </CardTitle>
            <CardDescription>
              {LODGING.bedrooms} bedrooms, {LODGING.beds} beds. Hot tub and cold plunge
              on the deck.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/basecamp"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              See the house &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Fri &ndash; Sun
            </p>
            <CardTitle className="font-display text-xl font-bold uppercase tracking-wide">
              The agenda
            </CardTitle>
            <CardDescription>
              Sporting clays, whitewater rafting, hot springs, and a field day at the
              cabin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/activities"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              What we&rsquo;re doing &rarr;
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-start gap-4 border-t border-border py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Before you show up
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide">
            Add your info
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Flights, dietary restrictions, and your votes on the toss-up activities —
            takes two minutes.
          </p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/rsvp">Add your info</Link>
        </Button>
      </section>
    </div>
  );
}
