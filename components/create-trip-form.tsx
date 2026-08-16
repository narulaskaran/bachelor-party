"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrganizerPacketView } from "@/components/organizer-packet-view";
import {
  createTripFromUi,
  END_BEFORE_START_MESSAGE,
  isInvertedDateRange,
  type CreateTripFields,
  type CreateTripResult,
  type OrganizerPacket,
} from "@/lib/create-trip";
import { sectionTitleClass } from "@/lib/type";

export function CreateTripForm({
  create = createTripFromUi,
}: {
  create?: (fields: CreateTripFields) => Promise<CreateTripResult>;
} = {}) {
  const [packet, setPacket] = useState<OrganizerPacket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [startMin, setStartMin] = useState("");

  if (packet) {
    return (
      <OrganizerPacketView
        packet={packet}
        onCreateAnother={() => {
          setPacket(null);
          setError(null);
          setStartMin("");
        }}
      />
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const siteName = String(form.get("siteName") ?? "");
    const startDate = String(form.get("startDate") ?? "").trim();
    const endDate = String(form.get("endDate") ?? "").trim();
    if (isInvertedDateRange(startDate, endDate)) {
      setError(END_BEFORE_START_MESSAGE);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await create({
        siteName,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });
      if (result.ok) {
        setPacket(result.packet);
      } else {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h2 id="create-trip-heading" className={sectionTitleClass}>
        Create a trip
      </h2>
      <p id="create-trip-hint" className="mt-2 max-w-xl text-sm text-muted-foreground">
        Name it — that&apos;s enough. Dates are optional. You&apos;ll get an
        invite link, a guest password, and a host key once. No account
        required.
      </p>
      <form onSubmit={onSubmit} className="mt-6 flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="siteName">Trip name</Label>
          <Input
            id="siteName"
            name="siteName"
            type="text"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="Jackson Hole '26"
            aria-describedby={error ? "create-trip-error create-trip-hint" : "create-trip-hint"}
            aria-invalid={error ? true : undefined}
            disabled={pending}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="startDate">Start date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              disabled={pending}
              aria-invalid={error === END_BEFORE_START_MESSAGE ? true : undefined}
              aria-describedby={error === END_BEFORE_START_MESSAGE ? "create-trip-error" : undefined}
              onChange={(event) => setStartMin(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endDate">End date</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              min={startMin || undefined}
              disabled={pending}
              aria-invalid={error === END_BEFORE_START_MESSAGE ? true : undefined}
              aria-describedby={error === END_BEFORE_START_MESSAGE ? "create-trip-error" : undefined}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Dates are optional.</p>
        {error ? (
          <p id="create-trip-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create a trip"}
        </Button>
      </form>
    </>
  );
}
