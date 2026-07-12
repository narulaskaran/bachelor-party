"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitGuestInfo } from "@/app/rsvp/actions";
import { POLL_ACTIVITIES } from "@/lib/party";

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

export function RsvpForm() {
  const [state, formAction, isPending] = useActionState(submitGuestInfo, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast.success("Saved. You're on the board.");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-10">
      {/* WHO */}
      <section className="space-y-4">
        <Eyebrow>Who</Eyebrow>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Full name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="(555) 555-5555" />
        </div>
      </section>

      {/* FLIGHTS */}
      <section className="space-y-4 border-t border-border pt-8">
        <Eyebrow>Flights</Eyebrow>
        <p className="text-sm text-muted-foreground">
          Flying into DEN. Leave blank if driving.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="arrivalFlight">Arrival flight</Label>
            <Input id="arrivalFlight" name="arrivalFlight" placeholder="UA 1523" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arrivalTime">Arrival time</Label>
            <Input
              id="arrivalTime"
              name="arrivalTime"
              placeholder="Fri Sep 4, 10:45 AM"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departureFlight">Departure flight</Label>
            <Input id="departureFlight" name="departureFlight" placeholder="UA 887" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departureTime">Departure time</Label>
            <Input
              id="departureTime"
              name="departureTime"
              placeholder="Mon Sep 7, 3:15 PM"
            />
          </div>
        </div>
      </section>

      {/* FOOD */}
      <section className="space-y-4 border-t border-border pt-8">
        <Eyebrow>Food</Eyebrow>
        <div className="space-y-2">
          <Label htmlFor="dietary">Dietary restrictions</Label>
          <Textarea
            id="dietary"
            name="dietary"
            placeholder="Allergies, no-gos, keto martyrdom…"
          />
        </div>
      </section>

      {/* VOTES */}
      <section className="space-y-2 border-t border-border pt-8">
        <Eyebrow>Votes</Eyebrow>
        <p className="text-sm text-muted-foreground">
          The toss-up activities — tell us where you stand.
        </p>
        <div>
          {POLL_ACTIVITIES.map((activity) => (
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

      {/* NOTES */}
      <section className="space-y-4 border-t border-border pt-8">
        <Eyebrow>Notes</Eyebrow>
        <div className="space-y-2">
          <Label htmlFor="notes">Anything else</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Early departure, carpool offers, playlist demands."
          />
        </div>
      </section>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
