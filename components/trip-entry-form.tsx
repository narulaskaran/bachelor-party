"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tripPathFromInput } from "@/lib/trip-entry";

export function TripEntryForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const path = tripPathFromInput(
      String(new FormData(event.currentTarget).get("slug") ?? ""),
    );
    if (!path) {
      setError("Enter your trip code or invite link.");
      return;
    }
    setError("");
    router.push(path);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor="trip-slug">Trip code</Label>
          <Input
            id="trip-slug"
            name="slug"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            required
            placeholder="your-trip"
            aria-describedby="trip-entry-hint"
            aria-invalid={error ? true : undefined}
          />
        </div>
        <Button type="submit">Open trip</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
