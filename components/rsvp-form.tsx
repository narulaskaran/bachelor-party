"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitGuestInfo, submitSampleGuestInfo } from "@/lib/rsvp-actions";
import { rsvpFieldDefaults, type RsvpPrefill } from "@/lib/merge-guest";
import type { Activity } from "@/lib/party-types";

const VOTE_OPTIONS = [
  { value: "hyped", label: "Hyped" },
  { value: "fine", label: "Fine either way" },
  { value: "pass", label: "Pass" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function HadField({
  name,
  value,
}: {
  name: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return <input type="hidden" name={`had:${name}`} value="1" />;
}

export function RsvpForm({
  pollActivities,
  airport,
  existing,
  sample = false,
}: {
  pollActivities: Activity[];
  airport?: string;
  existing?: RsvpPrefill | null;
  sample?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    sample ? submitSampleGuestInfo : submitGuestInfo,
    null,
  );
  const router = useRouter();
  const defaults = rsvpFieldDefaults(existing);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Saved. You're on the board.", { duration: 5000 });
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-10">
      {existing ? (
        <input type="hidden" name="prefillNameKey" value={existing.nameKey} />
      ) : null}

      {/* WHO */}
      <section className="space-y-4">
        <Eyebrow>Who</Eyebrow>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="Full name"
            defaultValue={defaults.name}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <HadField name="phone" value={existing?.phone} />
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(555) 555-5555"
            defaultValue={defaults.phone}
          />
        </div>
      </section>

      {airport ? (
      <section className="space-y-4 border-t border-border pt-8">
        <Eyebrow>Flights</Eyebrow>
        <p className="text-sm text-muted-foreground">
          Flying into {airport}. Leave blank if driving.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="arrivalFlight">Arrival flight</Label>
            <HadField name="arrivalFlight" value={existing?.arrivalFlight} />
            <Input
              id="arrivalFlight"
              name="arrivalFlight"
              placeholder="UA 1523"
              defaultValue={defaults.arrivalFlight}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arrivalTime">Arrival time</Label>
            <HadField name="arrivalTime" value={existing?.arrivalTime} />
            <Input
              id="arrivalTime"
              name="arrivalTime"
              placeholder="Fri, 10:45 AM"
              defaultValue={defaults.arrivalTime}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departureFlight">Departure flight</Label>
            <HadField name="departureFlight" value={existing?.departureFlight} />
            <Input
              id="departureFlight"
              name="departureFlight"
              placeholder="UA 887"
              defaultValue={defaults.departureFlight}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departureTime">Departure time</Label>
            <HadField name="departureTime" value={existing?.departureTime} />
            <Input
              id="departureTime"
              name="departureTime"
              placeholder="Mon, 3:15 PM"
              defaultValue={defaults.departureTime}
            />
          </div>
        </div>
      </section>
      ) : null}

      {/* FOOD */}
      <section className="space-y-4 border-t border-border pt-8">
        <Eyebrow>Food</Eyebrow>
        <div className="space-y-2">
          <Label htmlFor="dietary">Dietary restrictions</Label>
          <HadField name="dietary" value={existing?.dietary} />
          <Textarea
            id="dietary"
            name="dietary"
            placeholder="Allergies, no-gos, keto martyrdom…"
            defaultValue={defaults.dietary}
          />
        </div>
      </section>

      {pollActivities.length > 0 ? (
      <section className="space-y-2 border-t border-border pt-8">
        <Eyebrow>Votes</Eyebrow>
        <p className="text-sm text-muted-foreground">
          The toss-up activities — tell us where you stand.
        </p>
        <div>
          {pollActivities.map((activity) => (
            <fieldset
              key={activity.slug}
              className="border-t border-border py-4 first:border-t-0"
            >
              <legend className="sr-only">{activity.name}</legend>
              <p className="font-medium">{activity.name}</p>
              {activity.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {activity.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {VOTE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name={`pref:${activity.slug}`}
                      value={opt.value}
                      defaultChecked={defaults.activityPrefs[activity.slug] === opt.value}
                      className="peer sr-only"
                    />
                    <span className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>
      ) : null}

      {/* NOTES */}
      <section className="space-y-4 border-t border-border pt-8">
        <Eyebrow>Notes</Eyebrow>
        <div className="space-y-2">
          <Label htmlFor="notes">Anything else</Label>
          <HadField name="notes" value={existing?.notes} />
          <Textarea
            id="notes"
            name="notes"
            placeholder="Early departure, carpool offers, playlist demands."
            defaultValue={defaults.notes}
          />
        </div>
      </section>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state?.ok ? (
        <Alert>
          <AlertDescription>Saved. You&rsquo;re on the board.</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : state?.ok ? "Saved" : "Save"}
      </Button>
    </form>
  );
}
