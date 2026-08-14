import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RsvpForm } from "@/components/rsvp-form";
import { getGuests, getRsvpPrefill } from "@/lib/rsvp-actions";
import type { Activity } from "@/lib/party-types";

export async function RsvpSection({
  pollActivities,
  airport,
  sample = false,
}: {
  pollActivities: Activity[];
  airport?: string;
  sample?: boolean;
}) {
  const guests = sample ? [] : await getGuests();
  const prefill = sample ? null : await getRsvpPrefill(guests);
  const formKey = prefill
    ? `${prefill.nameKey}:${String(prefill.updatedAt ?? "")}`
    : "new";

  return (
    <section id="rsvp" className="scroll-mt-20 border-t border-border py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Logistics
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        Your Info
      </h2>
      <p className="mt-2 max-w-xl text-muted-foreground">
        {airport
          ? "Flights, food, and votes — takes two minutes. Re-submit with the same name any time to update. Leave a field blank to keep what you already saved."
          : "Name, food, and anything else — takes two minutes. Re-submit with the same name any time to update. Leave a field blank to keep what you already saved."}
      </p>

      <div className="mt-8">
        <RsvpForm
          key={formKey}
          sample={sample}
          pollActivities={pollActivities}
          airport={airport}
          existing={prefill}
        />
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Roster
        </p>
        <h3 className="mt-2 font-display text-xl font-bold uppercase tracking-wide">
          Who&rsquo;s checked in
        </h3>

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
                  {airport ? (
                    <>
                      <p className="break-words font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        Arrival · {guest.arrivalFlight || "—"} · {guest.arrivalTime || "—"}
                      </p>
                      <p className="break-words font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        Departure · {guest.departureFlight || "—"} ·{" "}
                        {guest.departureTime || "—"}
                      </p>
                    </>
                  ) : null}
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
      </div>
    </section>
  );
}
