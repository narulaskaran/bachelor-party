"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  EVENT_PRESET_HINTS,
  EVENT_PRESET_LABELS,
  EVENT_PRESET_PLACEHOLDERS,
  EVENT_PRESETS,
  type EventPreset,
} from "@/lib/event-preset";
import {
  createTripFromUi,
  type CreateTripFields,
  type CreateTripResult,
} from "@/lib/create-trip";
import { openAsHost } from "@/lib/host-access";
import { rememberHostKey } from "@/lib/host-key-storage";
import { sectionTitleClass } from "@/lib/type";

export { hostKeyStorageKey } from "@/lib/host-key-storage";

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
      <form onSubmit={onSubmit} className="mt-6 flex max-w-xl flex-col gap-4">
        <fieldset className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            {EVENT_PRESETS.map((value) => {
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
                      {EVENT_PRESET_HINTS[value]}
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
            Describe your event
          </label>
          <Textarea
            id="plan"
            name="plan"
            rows={10}
            required
            placeholder={EVENT_PRESET_PLACEHOLDERS[preset]}
            disabled={pending}
            className="min-h-48"
          />
        </div>
        {error ? (
          <p id="create-trip-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-fit max-w-sm self-start">
          {pending ? "Creating…" : "Create draft"}
        </Button>
      </form>
    </>
  );
}
