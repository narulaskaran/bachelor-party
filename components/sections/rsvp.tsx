import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RsvpForm } from "@/components/rsvp-form";
import { getGuests, getRsvpPrefill } from "@/lib/rsvp-roster";
import type { Activity, RsvpConfig } from "@/lib/party-types";
import { sectionTitleClass } from "@/lib/type";

export async function RsvpSection({
  pollActivities,
  airport,
  rsvpConfig = {},
  sample = false,
  preview = false,
  inviteToken,
  heading,
  description,
  extras = { flights: Boolean(airport), food: false, votes: pollActivities.length > 0, notes: false },
}: {
  pollActivities: Activity[];
  airport?: string;
  rsvpConfig?: RsvpConfig;
  sample?: boolean;
  preview?: boolean;
  inviteToken?: string;
  heading?: string;
  description?: string;
  extras?: { flights: boolean; food: boolean; votes: boolean; notes: boolean };
}) {
  const skipGuestCookie = sample || preview;
  const guests = skipGuestCookie ? [] : await getGuests(inviteToken);
  const prefill = skipGuestCookie ? null : await getRsvpPrefill(inviteToken);
  const formKey = prefill
    ? `self:${String(prefill.updatedAt ?? "")}`
    : "new";

  return (
    <section id="rsvp" className="scroll-mt-20 py-12 sm:py-16">
      <h2 className={sectionTitleClass}>{heading || "RSVP"}</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        {description || (sample
          ? "Preview of the guest RSVP form."
          : "Yes, maybe, or no — takes one minute. Come back on this browser to update.")}
      </p>

      <div className="mt-8">
        <RsvpForm
          key={formKey}
          sample={sample}
          preview={preview}
          inviteToken={skipGuestCookie ? undefined : inviteToken}
          pollActivities={pollActivities}
          airport={airport}
          rsvpConfig={rsvpConfig}
          existing={prefill}
          extras={extras}
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
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {guest.attendanceStatus === "maybe" ? "Maybe" : "Yes"}
                    </span>
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
