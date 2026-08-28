"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitGuestInfo, submitSampleGuestInfo } from "@/lib/rsvp-actions";
import { DEMO_RSVP_MESSAGE } from "@/lib/demo-party";
import { rsvpFieldDefaults, type RsvpPrefill } from "@/lib/merge-guest";
import { plusOneAllowed } from "@/lib/rsvp-contract";
import type { Activity, RsvpConfig } from "@/lib/party-types";
import { kickerClass } from "@/lib/type";
import { VoteActivityGroup } from "@/components/vote-activity-group";
import { cn } from "@/lib/utils";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className={cn("font-medium", kickerClass)}>{children}</p>;
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

type RsvpFormProps = {
  pollActivities: Activity[];
  airport?: string;
  existing?: RsvpPrefill | null;
  rsvpConfig?: RsvpConfig;
  sample?: boolean;
  preview?: boolean;
  inviteToken?: string;
  extras?: { flights: boolean; food: boolean; votes: boolean; notes: boolean };
};

export function RsvpForm({ preview = false, ...props }: RsvpFormProps) {
  if (preview) return <RsvpFormPreview />;
  return <LiveRsvpForm {...props} />;
}

/** Host guest preview — heading / description / who's coming live in RsvpSectionView. */
function RsvpFormPreview() {
  return <div data-rsvp-preview-static="" />;
}

function LiveRsvpForm({
  pollActivities,
  airport,
  existing,
  rsvpConfig = {},
  sample = false,
  inviteToken,
  extras = { flights: Boolean(airport), food: false, votes: pollActivities.length > 0, notes: false },
}: Omit<RsvpFormProps, "preview">) {
  const locked = sample;
  const [state, formAction, isPending] = useActionState(
    sample ? submitSampleGuestInfo : submitGuestInfo,
    null,
  );
  const router = useRouter();
  const defaults = rsvpFieldDefaults(existing);
  const allowPlusOne = plusOneAllowed(rsvpConfig);
  const [attendance, setAttendance] = useState<string>(defaults.attendanceStatus ?? "");
  const [plusOneName, setPlusOneName] = useState(defaults.plusOneName);
  const confirmed = Boolean(state?.ok || existing);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Saved. You're on the board.", { duration: 5000 });
      router.refresh();
    }
  }, [state, router]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (locked) event.preventDefault();
  }

  return (
    <form
      action={locked ? undefined : formAction}
      onSubmit={onSubmit}
      noValidate={locked}
      className="mx-auto max-w-2xl space-y-10"
    >
      {inviteToken ? <input type="hidden" name="invite" value={inviteToken} /> : null}
      {sample ? (
        <Alert id="demo-rsvp-banner">
          <AlertDescription>{DEMO_RSVP_MESSAGE}</AlertDescription>
        </Alert>
      ) : null}
      <section className="space-y-4">
        <Eyebrow>Who</Eyebrow>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            required={!sample}
            placeholder="Your name"
            defaultValue={defaults.name}
            className="min-h-11 h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <HadField name="phone" value={existing?.phone} />
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(555) 555-5555"
            defaultValue={defaults.phone}
            className="min-h-11 h-11"
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <Eyebrow>Attendance</Eyebrow>
        <fieldset role="group" aria-label="Attendance" className="space-y-3">
          <legend className="sr-only">Attendance</legend>
          {([
            ["attending", "Yes"],
            ["maybe", "Maybe"],
            ["not-attending", "No"],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
              <input
                type="radio"
                name="attendance"
                value={value}
                checked={attendance === value}
                required={!sample}
                onChange={() => setAttendance(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        {allowPlusOne && attendance === "attending" ? (
          <div className="space-y-2">
            <Label htmlFor="plusOneName">Plus-one name (optional)</Label>
            <HadField name="plusOneName" value={existing?.plusOneName} />
            <Input
              id="plusOneName"
              name="plusOneName"
              placeholder="Optional"
              value={plusOneName}
              onChange={(event) => setPlusOneName(event.target.value)}
              className="min-h-11 h-11"
            />
          </div>
        ) : null}
      </section>

      {extras.flights && airport ? (
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

      {extras.food ? (
      <section className="space-y-4 border-t border-border pt-8">
        <Eyebrow>Food</Eyebrow>
        <div className="space-y-2">
          <Label htmlFor="dietary">Dietary restrictions</Label>
          <HadField name="dietary" value={existing?.dietary} />
          <Textarea
            id="dietary"
            name="dietary"
            placeholder="Allergies, vegetarian, no shellfish…"
            defaultValue={defaults.dietary}
          />
        </div>
      </section>
      ) : null}

      {extras.votes && pollActivities.length > 0 ? (
      <section className="space-y-2 border-t border-border pt-8">
        <Eyebrow>Votes</Eyebrow>
        <p className="text-sm text-muted-foreground">
          The toss-up activities — tell us where you stand.
        </p>
        <div>
          {pollActivities.map((activity) => (
            <VoteActivityGroup
              key={activity.slug}
              activity={activity}
              defaultValue={defaults.activityPrefs[activity.slug]}
            />
          ))}
        </div>
      </section>
      ) : null}

      {extras.notes ? (
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
      ) : null}

      {sample ? null : state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {sample ? null : confirmed ? (
        <Alert>
          <AlertDescription>Saved. You&rsquo;re on the board.</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        variant={sample ? "secondary" : "default"}
        className={
          sample
            ? "min-h-11 w-full disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
            : "min-h-11 w-full"
        }
        disabled={sample || isPending}
        aria-describedby={sample ? "demo-rsvp-banner" : undefined}
      >
        {isPending ? "Saving…" : confirmed ? "Saved" : "Save"}
      </Button>
      {sample ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/#create" className="underline-offset-4 hover:text-primary hover:underline">
            Create your own trip to collect RSVPs
          </Link>
        </p>
      ) : null}
    </form>
  );
}
