"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScheduleSection } from "@/components/sections/schedule";
import { setScheduleKeyEvent } from "@/lib/host-access";
import { setDayKeyEvent } from "@/lib/key-events";
import type { ScheduleDay } from "@/lib/party-types";

export function HostScheduleView({
  slug,
  schedule: initial,
  sample = false,
  save = setScheduleKeyEvent,
}: {
  slug: string;
  schedule: ScheduleDay[];
  sample?: boolean;
  save?: typeof setScheduleKeyEvent;
}) {
  const [schedule, setSchedule] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (schedule.length === 0) {
    return null;
  }

  function onToggle(dayKey: string, entryIndex: number, key: boolean) {
    if (sample) {
      const next = setDayKeyEvent(schedule, dayKey, entryIndex, key);
      if (!next.ok) {
        setError(next.error);
        return;
      }
      setSchedule(next.schedule);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await save(slug, dayKey, entryIndex, key);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSchedule(result.schedule);
      setError(null);
    });
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-4 pb-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3 pt-8">
        <p className="text-sm text-muted-foreground">
          {sample ? "Sample trip — changes stay in this tab." : "Saved on this trip."}{" "}
          <Link href={`/${slug}`} className="underline-offset-4 hover:text-primary hover:underline">
            Guest view
          </Link>
        </p>
      </div>
      {sample ? (
        <Alert className="mt-6">
          <AlertTitle>This is the sample trip</AlertTitle>
          <AlertDescription>
            Try marking the headlines. Create a trip to save picks for your
            crew.
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <p className="mt-6 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <ScheduleSection
        schedule={schedule}
        picker={{ onToggle, busy: pending }}
        id="key-events"
      />
    </div>
  );
}
