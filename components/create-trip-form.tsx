"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTripFromUi, type OrganizerPacket } from "@/lib/create-trip";
import { OrganizerPacketView } from "@/components/organizer-packet-view";

export function CreateTripForm({
  create = createTripFromUi,
}: {
  create?: typeof createTripFromUi;
} = {}) {
  const [packet, setPacket] = useState<OrganizerPacket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (packet) {
    return <OrganizerPacketView packet={packet} />;
  }

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await create(String(formData.get("siteName") ?? ""));
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
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="siteName">Trip name</Label>
        <Input
          id="siteName"
          name="siteName"
          type="text"
          required
          autoComplete="off"
          autoFocus
          placeholder="Jackson Hole '26"
          aria-invalid={error ? true : undefined}
          disabled={pending}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create a trip"}
      </Button>
      <p className="text-xs text-muted-foreground">
        You&rsquo;ll get an invite link, a guest password, and an admin token.
        No account required.
      </p>
    </form>
  );
}
