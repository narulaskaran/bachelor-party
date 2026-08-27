"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_PRESET_LABELS, type EventPreset } from "@/lib/event-preset";
import {
  createTripFromUi,
  type CreateTripFields,
  type CreateTripResult,
} from "@/lib/create-trip";
import { openAsHost } from "@/lib/host-access";
import { rememberHostKey } from "@/lib/host-key-storage";
import { sectionTitleClass } from "@/lib/type";

export { hostKeyStorageKey } from "@/lib/host-key-storage";

const PLAN_PLACEHOLDER = `Friday drinks
Rita's on 6th
7-ish`;

export function CreateTripForm({
  create = createTripFromUi,
}: {
  create?: (fields: CreateTripFields) => Promise<CreateTripResult>;
} = {}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [preset, setPreset] = useState<EventPreset>("weekend");
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const plan = String(form.get("plan") ?? "").trim();
    if (!plan) {
      setError("Paste your notes.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await create({ siteName: "", plan, preset });
      if (result.ok) {
        rememberHostKey(result.packet.slug, result.packet.adminToken);
        const unlocked = await openAsHost(result.packet.slug, result.packet.adminToken);
        if (unlocked?.error) {
          setError(unlocked.error);
          router.push(`/${result.packet.slug}/host`);
        }
        return;
      }
      setError(result.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h2 id="create-trip-heading" tabIndex={-1} className={sectionTitleClass}>
        Create an event
      </h2>
      <p id="create-trip-hint" className="mt-2 max-w-xl text-sm text-muted-foreground">
        Dump what you know. We&apos;ll turn it into a private draft — never publish on its own.
      </p>
      <form onSubmit={onSubmit} className="mt-6 flex max-w-xl flex-col gap-4">
        <fieldset className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            {(["night-out", "weekend"] as EventPreset[]).map((value) => {
              const selected = preset === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPreset(value)}
                  className={`flex min-h-11 flex-1 items-center rounded-md border px-3 py-2 text-left text-sm ${
                    selected
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border"
                  }`}
                >
                  <span>
                    {EVENT_PRESET_LABELS[value]}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {value === "night-out"
                        ? "Details + RSVP"
                        : "Adds optional schedule, lodge, activities, pack"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="preset" value={preset} />
        </fieldset>
        <div className="flex flex-col gap-2">
          <label htmlFor="plan" className="text-sm font-medium">
            Your event notes
          </label>
          <Textarea
            id="plan"
            name="plan"
            rows={10}
            required
            placeholder={PLAN_PLACEHOLDER}
            aria-describedby="create-trip-hint create-trip-facts-hint"
            disabled={pending}
            className="min-h-48"
          />
          <p id="create-trip-facts-hint" className="text-xs text-muted-foreground">
            Only facts you know. We won&apos;t invent a time, place, or headcount.
          </p>
        </div>
        {error ? (
          <p id="create-trip-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-fit max-w-sm self-start">
          {pending ? "Creating…" : "Turn into a draft"}
        </Button>
      </form>
    </>
  );
}
