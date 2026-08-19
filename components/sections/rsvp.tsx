import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RsvpForm } from "@/components/rsvp-form";
import { getGuests, getRsvpPrefill } from "@/lib/rsvp-actions";
import type { Activity } from "@/lib/party-types";
import { sectionTitleClass } from "@/lib/type";

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
    ? `self:${String(prefill.updatedAt ?? "")}`
    : "new";

  return (
    <section id="rsvp" className="scroll-mt-20 py-12 sm:py-16">
      <h2 className={sectionTitleClass}>RSVP</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        {sample
          ? "Preview of the guest RSVP form — flights, food, and votes."
          : airport
            ? "Flights, food, and votes — takes two minutes. Come back on this browser to update. Leave a field blank to keep what you already saved."
            : "Name, food, and anything else — takes two minutes. Come back on this browser to update. Leave a field blank to keep what you already saved."}
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
        <h3 className="text-xl font-semibold tracking-tight">Who&rsquo;s coming</h3>

        {guests.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {sample
              ? "No one's on this sample list. RSVPs aren't saved here."
              : "No one's on the list yet. Add yours above."}
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {guests.map((guest) => (
              <Card key={guest.id}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold tracking-tight">
                    {guest.name}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
