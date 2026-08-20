"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { END_BEFORE_START_MESSAGE, formatDateLabel, isInvertedDateRange } from "@/lib/trip-dates";
import { parseScheduleText, rsvpForDraft, scheduleToText } from "@/lib/draft-publish";
import { draftFactsForContent } from "@/lib/plan-ingestion";
import type { DraftFact, PartyContent } from "@/lib/party-types";

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
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [reviewAcknowledged, setReviewAcknowledged] = useState(initial.draftReview?.acknowledged === true);
  const [hasSavedDraft, setHasSavedDraft] = useState(true);

  const trip = content.trip;
  const lodging = content.lodging;
  const scheduleText = scheduleToText(content.schedule);

  function updateTrip(field: keyof typeof trip, value: string) {
    setReviewAcknowledged(false);
    setHasSavedDraft(false);
    setContent((current) => {
      const next = {
        ...current,
        trip: { ...current.trip, [field]: value || undefined },
      };
      if (!current.draftReview) return next;
      return {
        ...next,
        draftReview: {
          ...current.draftReview,
          acknowledged: false,
          facts: draftFactsForContent(next, current.draftReview.facts),
        },
      };
    });
  }

  function reviewFacts(): DraftFact[] {
    return draftFactsForContent(content, content.draftReview?.facts);
  }

  function invalidateFieldEdit() {
    setReviewAcknowledged(false);
    setHasSavedDraft(false);
  }

  function handleFormChange(event: React.ChangeEvent<HTMLFormElement>) {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === "checkbox") return;
    invalidateFieldEdit();
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
        timezone: String(form.get("timezone") ?? "").trim() || undefined,
      },
      schedule,
      rsvp: rsvpForDraft(
        content.rsvp,
        String(form.get("rsvpHeading") ?? ""),
        String(form.get("rsvpDescription") ?? ""),
      ),
      presentation: {
        style: String(form.get("presentationStyle") ?? "clean") === "editorial" ? "editorial" : "clean",
      },
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
    next.draftReview = {
      ...(content.draftReview ?? { facts: [] }),
      acknowledged: reviewAcknowledged,
      facts: draftFactsForContent(next, content.draftReview?.facts),
    };

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
      setHasSavedDraft(true);
      setNotice("Draft saved. Guest view still shows the last published version.");
    });
  }

  function publishNow() {
    if (!reviewAcknowledged) {
      setError("Review every fact and confirm that no logistics were guessed before publishing.");
      setNotice(null);
      return;
    }
    if (!hasSavedDraft) {
      setError("Save the reviewed draft before publishing it.");
      setNotice(null);
      return;
    }
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await publish(slug);
      if (!result.ok) {
        setError(result.error ?? "Couldn't publish the draft.");
        return;
      }
      setPublishedUrl(`/${slug}`);
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
        <section aria-labelledby="review-heading" className="mb-8 rounded-lg border border-amber-300/70 bg-amber-50/60 p-4 dark:bg-amber-950/20">
          <h3 id="review-heading" className="text-lg font-semibold">Review the facts before sharing</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            We only use facts from your notes or fields. Missing, ambiguous, and timezone-free logistics stay TBD — never guessed.
          </p>
          {content.draftReview?.sourcePlan ? (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium">Show original notes</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-xs">{content.draftReview.sourcePlan}</pre>
            </details>
          ) : null}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Draft facts">
            {reviewFacts().map((item) => (
              <li key={item.path} className="rounded-md border border-border bg-background/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${item.status === "missing" || item.status === "stale" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-sm">{item.value || "TBD — needs confirmation"}</p>
                {item.note ? <p className="mt-1 text-xs text-muted-foreground">{item.note}</p> : null}
                {item.source ? <p className="mt-1 truncate text-xs text-muted-foreground">From: {item.source}</p> : null}
              </li>
            ))}
          </ul>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={reviewAcknowledged}
              onChange={(event) => {
                const checked = event.target.checked;
                setReviewAcknowledged(checked);
                setHasSavedDraft(false);
                setContent((current) => ({
                  ...current,
                  draftReview: {
                    ...(current.draftReview ?? { facts: draftFactsForContent(current) }),
                    acknowledged: checked,
                    facts: draftFactsForContent(current, current.draftReview?.facts),
                  },
                }));
              }}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>I reviewed every fact, corrected what I know, and confirm no logistics were guessed.</span>
          </label>
        </section>
        <form className="space-y-8" onSubmit={submit} onChange={handleFormChange}>
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
              <Field label="Time zone" name="timezone" value={trip.timezone ?? ""} onChange={(value) => updateTrip("timezone", value)} placeholder="e.g. America/Denver" />
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
            <legend className="text-lg font-semibold">Page presentation</legend>
            <p className="text-sm text-muted-foreground">Choose how the same event facts feel on the guest page. This changes presentation only, not logistics.</p>
            <Label htmlFor="presentationStyle">Page style</Label>
            <select
              id="presentationStyle"
              name="presentationStyle"
              defaultValue={content.presentation?.style ?? "clean"}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
            >
              <option value="clean">Clean and practical</option>
              <option value="editorial">Editorial and celebratory</option>
            </select>
          </fieldset>

          <fieldset disabled={isPending || sample} className="space-y-3">
            <legend className="text-lg font-semibold">Schedule</legend>
            <p className="text-sm text-muted-foreground">One event per line: date | weekday | day label | time | event title | optional note. Leave time out for a loose plan.</p>
            <Label htmlFor="schedule-input">Schedule events</Label>
            <Textarea id="schedule-input" name="schedule" defaultValue={scheduleText} rows={8} aria-describedby="schedule-help" />
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
          {notice ? (
            <div role="status" className="space-y-1 text-sm text-emerald-700">
              <p>{notice}</p>
              {publishedUrl ? <a href={publishedUrl} className="font-medium underline underline-offset-4">Open the guest page: {publishedUrl}</a> : null}
            </div>
          ) : null}
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
  placeholder,
  required,
  onChange,
}: {
  label: string;
  name: string;
  value?: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} value={value} defaultValue={defaultValue} placeholder={placeholder} required={required} onChange={onChange ? (event) => onChange(event.target.value) : undefined} />
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
