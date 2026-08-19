"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { END_BEFORE_START_MESSAGE, isInvertedDateRange } from "@/lib/trip-dates";
import { parseScheduleText, rsvpForDraft, scheduleToText } from "@/lib/draft-publish";
import type { PartyContent } from "@/lib/party-types";

export type HostEditorAction =
  (slug: string, content: PartyContent, preserveScheduleKeyEvents?: boolean) => Promise<{ ok: boolean; error?: string }>;

export function HostEditor({
  slug,
  initial,
  published,
  sample = false,
  save,
  publish,
}: {
  slug: string;
  initial: PartyContent;
  published: boolean;
  sample?: boolean;
  save: HostEditorAction;
  publish: (slug: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [content, setContent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trip = content.trip;
  const lodging = content.lodging;
  const scheduleText = scheduleToText(content.schedule);

  function updateTrip(field: keyof typeof trip, value: string) {
    setContent((current) => ({ ...current, trip: { ...current.trip, [field]: value || undefined } }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startDate = String(form.get("startDate") ?? "").trim();
    const endDate = String(form.get("endDate") ?? "").trim();
    if (isInvertedDateRange(startDate, endDate)) {
      setError(END_BEFORE_START_MESSAGE);
      setNotice(null);
      return;
    }

    let schedule = content.schedule;
    const initialScheduleText = scheduleToText(content.schedule).trim();
    try {
      const rawSchedule = String(form.get("schedule") ?? "").trim();
      schedule = rawSchedule ? parseScheduleText(rawSchedule) : undefined;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fix the schedule lines.");
      setNotice(null);
      return;
    }

    const next: PartyContent = {
      ...content,
      kind: "trip",
      trip: {
        ...content.trip,
        siteName: String(form.get("siteName") ?? "").trim(),
        tagline: String(form.get("tagline") ?? "").trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        dateLabel: formatDateLabel(startDate, endDate),
        location: String(form.get("location") ?? "").trim() || undefined,
        airport: String(form.get("airport") ?? "").trim() || undefined,
      },
      schedule,
      rsvp: rsvpForDraft(
        content.rsvp,
        String(form.get("rsvpHeading") ?? ""),
        String(form.get("rsvpDescription") ?? ""),
      ),
    };
    const lodgingName = String(form.get("lodgingName") ?? "").trim();
    if (lodgingName) {
      const lodgingUrlValue = String(form.get("lodgingUrl") ?? "").trim();
      const mapsUrlValue = String(form.get("mapsUrl") ?? "").trim();
      const url = urlForSave(lodgingUrlValue, content.lodging?.url);
      const mapsUrl = urlForSave(mapsUrlValue, content.lodging?.mapsUrl);
      if (lodgingUrlValue && !url) {
        setError("Lodging URL must use HTTPS.");
        setNotice(null);
        return;
      }
      if (mapsUrlValue && !mapsUrl) {
        setError("Maps URL must use HTTPS.");
        setNotice(null);
        return;
      }
      next.lodging = {
        ...content.lodging,
        name: lodgingName,
        url,
        mapsUrl,
        address: String(form.get("lodgingAddress") ?? "").trim() || undefined,
      };
    } else {
      next.lodging = undefined;
    }

    startTransition(async () => {
      setError(null);
      setNotice(null);
      const rawSchedule = String(form.get("schedule") ?? "").trim();
      const result = await save(slug, next, rawSchedule === initialScheduleText);
      if (!result.ok) {
        setError(result.error ?? "Couldn't save the draft.");
        return;
      }
      setContent(next);
      setNotice("Draft saved. Guest view still shows the last published version.");
    });
  }

  function publishNow() {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await publish(slug);
      if (!result.ok) {
        setError(result.error ?? "Couldn't publish the draft.");
        return;
      }
      setNotice("Published. Guests now see this version.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Trip editor</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {sample ? "Sample trip — changes stay in this tab." : published ? "Editing a private draft." : "Unpublished draft — guests cannot see these details."}
            </p>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs font-medium" aria-label={`Trip status: ${published ? "published" : "draft"}`}>
            {published ? "Published + draft" : "Draft — not published"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-8" onSubmit={submit}>
          <fieldset disabled={isPending || sample} className="space-y-6">
            <legend className="text-lg font-semibold">Trip basics</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trip title" name="siteName" value={trip.siteName} required onChange={(value) => updateTrip("siteName", value)} />
              <Field label="Tagline" name="tagline" value={trip.tagline ?? ""} onChange={(value) => updateTrip("tagline", value)} />
              <div>
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={trip.startDate ?? ""} aria-describedby="date-help" />
              </div>
              <div>
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={trip.endDate ?? ""} aria-describedby="date-help" aria-invalid={Boolean(error?.includes("End date"))} />
              </div>
            </div>
            <p id="date-help" className="text-xs text-muted-foreground">Dates are optional. End date cannot be before start date.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location" name="location" value={trip.location ?? ""} onChange={(value) => updateTrip("location", value)} />
              <Field label="Airport" name="airport" value={trip.airport ?? ""} onChange={(value) => updateTrip("airport", value)} />
            </div>
          </fieldset>

          <fieldset disabled={isPending || sample} className="space-y-4">
            <legend className="text-lg font-semibold">Lodging</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lodging name" name="lodgingName" defaultValue={lodging?.name ?? ""} />
              <Field label="Address" name="lodgingAddress" defaultValue={lodging?.address ?? ""} />
              <Field label="Listing URL (HTTPS)" name="lodgingUrl" type="url" defaultValue={lodging?.url ?? ""} />
              <Field label="Maps URL (HTTPS)" name="mapsUrl" type="url" defaultValue={lodging?.mapsUrl ?? ""} />
            </div>
          </fieldset>

          <fieldset disabled={isPending || sample} className="space-y-3">
            <legend className="text-lg font-semibold">Schedule</legend>
            <p className="text-sm text-muted-foreground">One event per line: date | weekday | day label | time | event title | optional note. Leave time out for a loose plan.</p>
            <Label htmlFor="schedule">Schedule events</Label>
            <Textarea id="schedule" name="schedule" defaultValue={scheduleText} rows={8} aria-describedby="schedule-help" />
            <p id="schedule-help" className="text-xs text-muted-foreground">Example: 2026-09-04 | Friday | Arrival | 7:00 PM | Group dinner</p>
          </fieldset>

          <fieldset disabled={isPending || sample} className="space-y-4">
            <legend className="text-lg font-semibold">RSVP section</legend>
            <Field label="RSVP heading" name="rsvpHeading" defaultValue={content.rsvp?.heading ?? ""} />
            <div>
              <Label htmlFor="rsvpDescription">RSVP instructions</Label>
              <Textarea id="rsvpDescription" name="rsvpDescription" defaultValue={content.rsvp?.description ?? ""} rows={3} />
            </div>
          </fieldset>

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={sample || isPending}>{isPending ? "Saving…" : "Save draft"}</Button>
            <Button type="button" variant="outline" onClick={publishNow} disabled={sample || isPending}>{isPending ? "Working…" : published ? "Publish latest draft" : "Publish for guests"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  value,
  defaultValue,
  type = "text",
  required,
  onChange,
}: {
  label: string;
  name: string;
  value?: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} value={value} defaultValue={defaultValue} required={required} onChange={onChange ? (event) => onChange(event.target.value) : undefined} />
    </div>
  );
}

function urlForSave(value: string, previous?: string): string | undefined {
  if (!value) return undefined;
  if (value === previous) {
    try {
      const protocol = new URL(value).protocol;
      if (protocol === "http:") return value;
    } catch {
      return undefined;
    }
  }
  return httpsOrUndefined(value);
}

function httpsOrUndefined(value: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    return new URL(value).protocol === "https:" ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

function formatDateLabel(start?: string, end?: string): string | undefined {
  if (!start && !end) return undefined;
  const format = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return start && end && start !== end ? `${format(start)} – ${format(end)}` : format(start ?? end ?? "");
}
