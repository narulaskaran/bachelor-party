import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RsvpForm } from "@/components/rsvp-form";
import { getGuests } from "@/app/rsvp/actions";

// Roster reads the database on every request.
export const dynamic = "force-dynamic";

export default async function Page() {
  const guests = await getGuests();

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="border-b border-border py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Logistics
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide sm:text-7xl">
          Your Info
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Flights, food, and votes — takes two minutes. Re-submit with the same
          name any time to update.
        </p>
      </section>

      <section className="py-12">
        <RsvpForm />
      </section>

      <section className="border-t border-border py-12">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Roster
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide">
          Who&rsquo;s checked in
        </h2>

        {guests.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No check-ins yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {guests.map((guest) => (
              <Card key={guest.id}>
                <CardHeader>
                  <CardTitle className="font-display text-lg font-bold tracking-wide">
                    {guest.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Arrival · {guest.arrivalFlight || "—"} · {guest.arrivalTime || "—"}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Departure · {guest.departureFlight || "—"} ·{" "}
                    {guest.departureTime || "—"}
                  </p>
                  {guest.dietary ? (
                    <Badge variant="outline" className="mt-2 h-auto px-2 py-1 text-xs">
                      {guest.dietary}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
