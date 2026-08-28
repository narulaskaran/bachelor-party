"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { END_BEFORE_START_MESSAGE } from "@/lib/trip-dates";
import { type HostPublishStatus } from "@/lib/draft-publish";
import { parseEventPreset, showWeekendEditorBlock, WEEKEND_SECTION_OPTIONS, type WeekendBlock } from "@/lib/event-preset";
import { draftFactsForContent } from "@/lib/plan-ingestion";
import {
  rowsFromActivities,
  rowsFromPacking,
  rowsFromSchedule,
  type ActivityEditorRow,
  type PackEditorRow,
  type ScheduleEditorRow,
} from "@/lib/schedule-rows";
import { formatGuestWhen, GUEST_WHEN_PLACEHOLDER } from "@/lib/guest-when";
import { EVENT_TIMEZONES, formatTimeZoneLabel, settledTimeZone } from "@/lib/timezones";
import type { DraftFact, PartyContent } from "@/lib/party-types";
import { readStoredHostKey, rememberHostKey } from "@/lib/host-key-storage";
import { HostLoginForm } from "@/app/[slug]/host/host-login-form";
import { unlockHostTrip } from "@/lib/host-access";
import { isWrongHostKeyError } from "@/lib/host-auth";
import { buildHostDraft, livePreviewContent, type HostLiveDraftInput } from "@/lib/host-live-draft";

export type HostEditorAction =
  (
    slug: string,
    content: PartyContent,
    preserveScheduleKeyEvents?: boolean,
    hostKey?: string,
  ) => Promise<{ ok: boolean; error?: string }>;

const EMPTY_SCHEDULE_ROW: ScheduleEditorRow = { date: "", time: "", title: "", note: "" };
const EMPTY_PACK_ROW: PackEditorRow = { title: "", note: "" };
const EMPTY_ACTIVITY_ROW: ActivityEditorRow = { name: "", note: "" };

export function HostEditor({
  slug,
  initial,
  published,
  publishStatus: initialPublishStatus,
  sample = false,
  guestUrl,
  save,
  publish,
  onLiveContentChange,
  onPublishStatusChange,
  onPublishedUrlChange,
  onDirtyChange,
}: {
  slug: string;
  initial: PartyContent;
  published: boolean;
  publishStatus?: HostPublishStatus;
  sample?: boolean;
  guestUrl?: string;
  save: HostEditorAction;
  publish: (slug: string, hostKey?: string) => Promise<{ ok: boolean; error?: string; guestUrl?: string }>;
  onLiveContentChange?: (content: PartyContent) => void;
  onPublishStatusChange?: (status: HostPublishStatus) => void;
  onPublishedUrlChange?: (url: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [content, setContent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(published ? guestUrl ?? null : null);
  const [isPending, startTransition] = useTransition();
  const [reviewAcknowledged, setReviewAcknowledged] = useState(initial.draftReview?.acknowledged === true);
  const [hasSavedDraft, setHasSavedDraft] = useState(true);
  const [factsOpen, setFactsOpen] = useState(initial.draftReview?.acknowledged !== true);
  const [publishStatus, setPublishStatus] = useState<HostPublishStatus>(
    initialPublishStatus ?? (published ? "live" : "draft-only"),
  );
  const preset = parseEventPreset(content.preset);
  const [scheduleRows, setScheduleRows] = useState<ScheduleEditorRow[]>(() => rowsFromSchedule(initial.schedule));
  const [packingRows, setPackingRows] = useState<PackEditorRow[]>(() => rowsFromPacking(initial.packing));
  const [activityRows, setActivityRows] = useState<ActivityEditorRow[]>(() => rowsFromActivities(initial.activities));
  const [enabledBlocks, setEnabledBlocks] = useState<Record<WeekendBlock, boolean>>({
    schedule: showWeekendEditorBlock(initial, "schedule"),
    lodging: showWeekendEditorBlock(initial, "lodging"),
    activities: showWeekendEditorBlock(initial, "activities"),
    packing: showWeekendEditorBlock(initial, "packing"),
  });
  const [mapsUrl, setMapsUrl] = useState(initial.trip.mapsUrl ?? "");
  const [lodgingName, setLodgingName] = useState(initial.lodging?.name ?? "");
  const [lodgingAddress, setLodgingAddress] = useState(initial.lodging?.address ?? "");
  const [lodgingUrl, setLodgingUrl] = useState(initial.lodging?.url ?? "");
  const [lodgingMapsUrl, setLodgingMapsUrl] = useState(initial.lodging?.mapsUrl ?? "");
  const [presentationStyle, setPresentationStyle] = useState<"clean" | "editorial">(
    initial.presentation?.style === "editorial" ? "editorial" : "clean",
  );
  const [rsvpHeading, setRsvpHeading] = useState(initial.rsvp?.heading ?? "");
  const [rsvpDescription, setRsvpDescription] = useState(initial.rsvp?.description ?? "");
  const [plusOnes, setPlusOnes] = useState<"allowed" | "not-allowed">(
    initial.rsvp?.plusOnePolicy === "allowed" || initial.rsvp?.allowPlusOne === true
      ? "allowed"
      : "not-allowed",
  );

  const [hostKeyFallback, setHostKeyFallback] = useState("");
  const lastValidRef = useRef(initial);

  const trip = content.trip;

  const liveInput: HostLiveDraftInput = useMemo(
    () => ({
      content,
      preset,
      enabledBlocks,
      scheduleRows,
      packingRows,
      activityRows,
      reviewAcknowledged,
      mapsUrl,
      lodgingName,
      lodgingAddress,
      lodgingUrl,
      lodgingMapsUrl,
      rsvpHeading,
      rsvpDescription,
      plusOnes,
      presentationStyle,
    }),
    [
      content,
      preset,
      enabledBlocks,
      scheduleRows,
      packingRows,
      activityRows,
      reviewAcknowledged,
      mapsUrl,
      lodgingName,
      lodgingAddress,
      lodgingUrl,
      lodgingMapsUrl,
      rsvpHeading,
      rsvpDescription,
      plusOnes,
      presentationStyle,
    ],
  );

  useEffect(() => {
    const next = livePreviewContent(liveInput, lastValidRef.current);
    lastValidRef.current = next;
    onLiveContentChange?.(next);
  }, [liveInput, onLiveContentChange]);

  useEffect(() => {
    onDirtyChange?.(!hasSavedDraft);
  }, [hasSavedDraft, onDirtyChange]);

  useEffect(() => {
    onPublishStatusChange?.(publishStatus);
  }, [publishStatus, onPublishStatusChange]);

  useEffect(() => {
    onPublishedUrlChange?.(publishedUrl);
  }, [publishedUrl, onPublishedUrlChange]);

  function invalidateFieldEdit() {
    setReviewAcknowledged(false);
    setHasSavedDraft(false);
    setFactsOpen(true);
  }

  function updateTrip(field: keyof typeof trip, value: string) {
    invalidateFieldEdit();
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
    return draftFactsForContent({ ...content, preset }, content.draftReview?.facts);
  }

  function handleFormChange(event: React.ChangeEvent<HTMLFormElement>) {
    const target = event.target;
    if (target instanceof HTMLInputElement && (target.type === "checkbox" || target.name === "hostKeyFallback")) return;
    invalidateFieldEdit();
  }

  function enableBlock(block: WeekendBlock) {
    invalidateFieldEdit();
    setEnabledBlocks((current) => ({ ...current, [block]: true }));
    if (block === "schedule" && scheduleRows.length === 0) setScheduleRows([{ ...EMPTY_SCHEDULE_ROW }]);
    if (block === "packing" && packingRows.length === 0) setPackingRows([{ ...EMPTY_PACK_ROW }]);
    if (block === "activities" && activityRows.length === 0) setActivityRows([{ ...EMPTY_ACTIVITY_ROW }]);
  }

  const hiddenBlocks = useMemo(
    () =>
      (["schedule", "lodging", "activities", "packing"] as WeekendBlock[]).filter(
        (block) => !enabledBlocks[block],
      ),
    [enabledBlocks],
  );

  function hostKeyForActions(form?: FormData): string | undefined {
    const typed = (form ? String(form.get("hostKeyFallback") ?? "") : hostKeyFallback).trim();
    if (typed) {
      rememberHostKey(slug, typed);
      return typed;
    }
    return readStoredHostKey(slug);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const built = buildHostDraft(liveInput);
    if (!built.ok) {
      setError(built.error === "inverted-dates" ? END_BEFORE_START_MESSAGE : built.error);
      setNotice(null);
      return;
    }
    const next = built.content;
    const scheduleUnchanged =
      JSON.stringify(rowsFromSchedule(content.schedule)) === JSON.stringify(scheduleRows);

    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await save(slug, next, scheduleUnchanged, hostKeyForActions(form));
      if (!result.ok) {
        setError(result.error ?? "Couldn't save the draft.");
        return;
      }
      setContent(next);
      lastValidRef.current = next;
      setHasSavedDraft(true);
      if (reviewAcknowledged) setFactsOpen(false);
      if (publishStatus === "live" || publishedUrl) setPublishStatus("unpublished-changes");
      setNotice("Draft saved. Guest view still shows the last published version.");
    });
  }

  function publishNow() {
    if (!reviewAcknowledged) {
      setError("Review every fact and confirm that no logistics were guessed before publishing.");
      setNotice(null);
      setFactsOpen(true);
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
      const result = await publish(slug, hostKeyForActions());
      if (!result.ok) {
        setError(result.error ?? "Couldn't publish the draft.");
        return;
      }
      const nextUrl = result.guestUrl ?? publishedUrl;
      if (nextUrl) setPublishedUrl(nextUrl);
      setPublishStatus("live");
      setNotice("Published. Guests now see this version.");
    });
  }

  return (
    <Card className="overflow-visible">
      <CardContent>
        {isWrongHostKeyError(error) ? (
          <div className="mb-6 rounded-lg border border-border p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Enter the host key from when you created this event. This is not the guest link.
            </p>
            <HostLoginForm
              slug={slug}
              loginAction={async (_state, formData) =>
                unlockHostTrip(slug, String(formData.get("hostKey") ?? ""))
              }
            />
          </div>
        ) : null}
        <details
          className="mb-8 rounded-lg border border-amber-300/70 bg-amber-50/60 p-4 dark:bg-amber-950/20"
          open={factsOpen}
          onToggle={(event) => setFactsOpen(event.currentTarget.open)}
        >
          <summary id="review-heading" className="cursor-pointer text-lg font-semibold">
            Review the facts before sharing
          </summary>
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
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
                  setFactsOpen(true);
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
          </div>
        </details>
        <form className="space-y-8" onSubmit={submit} onChange={handleFormChange}>
          <fieldset disabled={isPending || sample} className="space-y-6">
            <legend className="text-lg font-semibold">Event basics</legend>
            <Field label="Event title" name="siteName" value={trip.siteName} required onChange={(value) => updateTrip("siteName", value)} />
            <Field label="Tagline" name="tagline" value={trip.tagline ?? ""} onChange={(value) => updateTrip("tagline", value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={trip.startDate ?? ""}
                  aria-describedby="date-help when-preview"
                  onChange={(event) => updateTrip("startDate", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={trip.endDate ?? ""}
                  aria-describedby="date-help when-preview"
                  aria-invalid={Boolean(error?.includes("End date"))}
                  onChange={(event) => updateTrip("endDate", event.target.value)}
                />
              </div>
              <Field label="Start time" name="startTime" value={trip.startTime ?? ""} placeholder="7:00 PM" onChange={(value) => updateTrip("startTime", value)} />
              <div>
                <Label htmlFor="timezone">Time zone</Label>
                <select
                  id="timezone"
                  name="timezone"
                  value={settledTimeZone(trip.timezone) ?? ""}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) => updateTrip("timezone", event.target.value)}
                >
                  <option value="">Not set — time stays TBD</option>
                  {EVENT_TIMEZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {formatTimeZoneLabel(zone)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p id="when-preview" className="text-sm" aria-live="polite">
              Guests will see: {formatGuestWhen(trip) ?? GUEST_WHEN_PLACEHOLDER}
            </p>
            <p id="date-help" className="text-xs text-muted-foreground">
              Dates are optional. End date cannot be before start date. No timezone means guests see time TBD — we will not guess America/New_York.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location" name="location" value={trip.location ?? ""} onChange={(value) => updateTrip("location", value)} />
              <Field label="Place address" name="address" value={trip.address ?? ""} onChange={(value) => updateTrip("address", value)} />
              <Field label="Maps URL (HTTPS)" name="mapsUrl" type="url" value={mapsUrl} onChange={setMapsUrl} />
            </div>
          </fieldset>

          {hiddenBlocks.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="add-section">Add section</Label>
              <select
                id="add-section"
                value=""
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
                onChange={(event) => {
                  const block = event.target.value as WeekendBlock;
                  if (block) enableBlock(block);
                }}
              >
                <option value="">Choose…</option>
                {WEEKEND_SECTION_OPTIONS.filter((option) => hiddenBlocks.includes(option.block)).map((option) => (
                  <option key={option.block} value={option.block}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {enabledBlocks.lodging ? (
            <fieldset disabled={isPending || sample} className="space-y-4">
              <legend className="text-lg font-semibold">Lodge</legend>
              <p className="text-sm text-muted-foreground">Name, address, maps — no beds or headcount required.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lodging name" name="lodgingName" value={lodgingName} onChange={setLodgingName} />
                <Field label="Lodge address" name="lodgingAddress" value={lodgingAddress} onChange={setLodgingAddress} />
                <Field label="Listing URL (HTTPS)" name="lodgingUrl" type="url" value={lodgingUrl} onChange={setLodgingUrl} />
                <Field label="Lodge maps URL (HTTPS)" name="lodgingMapsUrl" type="url" value={lodgingMapsUrl} onChange={setLodgingMapsUrl} />
              </div>
            </fieldset>
          ) : null}

          <fieldset disabled={isPending || sample} className="space-y-3">
            <legend className="text-lg font-semibold">Page presentation</legend>
            <p className="text-sm text-muted-foreground">Two looks only. This is presentation, not a third event type.</p>
            <Label htmlFor="presentationStyle">Page style</Label>
            <select
              id="presentationStyle"
              name="presentationStyle"
              value={presentationStyle}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
              onChange={(event) => setPresentationStyle(event.target.value === "editorial" ? "editorial" : "clean")}
            >
              <option value="clean">Clean and practical</option>
              <option value="editorial">Editorial and celebratory</option>
            </select>
          </fieldset>

          {enabledBlocks.schedule ? (
            <fieldset disabled={isPending || sample} className="space-y-3">
              <legend className="text-lg font-semibold">Schedule</legend>
              <p className="text-sm text-muted-foreground">Add or remove rows. Hidden for guests when empty.</p>
              <ol className="space-y-3">
                {scheduleRows.map((row, index) => (
                  <li key={index} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
                    <Field
                      label={`Schedule date ${index + 1}`}
                      name={`scheduleDate-${index}`}
                      type="date"
                      value={row.date}
                      onChange={(value) => {
                        invalidateFieldEdit();
                        setScheduleRows((rows) => rows.map((item, i) => (i === index ? { ...item, date: value } : item)));
                      }}
                    />
                    <Field
                      label={`Schedule time ${index + 1}`}
                      name={`scheduleTime-${index}`}
                      value={row.time}
                      onChange={(value) => {
                        invalidateFieldEdit();
                        setScheduleRows((rows) => rows.map((item, i) => (i === index ? { ...item, time: value } : item)));
                      }}
                    />
                    <Field
                      label={`Schedule title ${index + 1}`}
                      name={`scheduleTitle-${index}`}
                      value={row.title}
                      onChange={(value) => {
                        invalidateFieldEdit();
                        setScheduleRows((rows) => rows.map((item, i) => (i === index ? { ...item, title: value } : item)));
                      }}
                    />
                    <Field
                      label={`Schedule note ${index + 1}`}
                      name={`scheduleNote-${index}`}
                      value={row.note}
                      onChange={(value) => {
                        invalidateFieldEdit();
                        setScheduleRows((rows) => rows.map((item, i) => (i === index ? { ...item, note: value } : item)));
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        invalidateFieldEdit();
                        setScheduleRows((rows) => rows.filter((_, i) => i !== index));
                      }}
                    >
                      Remove row
                    </Button>
                  </li>
                ))}
              </ol>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  invalidateFieldEdit();
                  setScheduleRows((rows) => [...rows, { ...EMPTY_SCHEDULE_ROW }]);
                }}
              >
                Add schedule row
              </Button>
            </fieldset>
          ) : null}

          {enabledBlocks.activities ? (
            <fieldset disabled={isPending || sample} className="space-y-3">
              <legend className="text-lg font-semibold">Activities</legend>
              <ol className="space-y-3">
                {activityRows.map((row, index) => (
                  <li key={index} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
                    <Field
                      label={`Activity name ${index + 1}`}
                      name={`activityName-${index}`}
                      value={row.name}
                      onChange={(value) => {
                        invalidateFieldEdit();
                        setActivityRows((rows) => rows.map((item, i) => (i === index ? { ...item, name: value } : item)));
                      }}
                    />
                    <Field
                      label={`Activity note ${index + 1}`}
                      name={`activityNote-${index}`}
                      value={row.note}
                      onChange={(value) => {
                        invalidateFieldEdit();
                        setActivityRows((rows) => rows.map((item, i) => (i === index ? { ...item, note: value } : item)));
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        invalidateFieldEdit();
                        setActivityRows((rows) => rows.filter((_, i) => i !== index));
                      }}
                    >
                      Remove activity
                    </Button>
                  </li>
                ))}
              </ol>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  invalidateFieldEdit();
                  setActivityRows((rows) => [...rows, { ...EMPTY_ACTIVITY_ROW }]);
                }}
              >
                Add activity
              </Button>
            </fieldset>
          ) : null}

          {enabledBlocks.packing ? (
            <fieldset disabled={isPending || sample} className="space-y-3">
              <legend className="text-lg font-semibold">Pack list</legend>
              <p className="text-sm text-muted-foreground">Host-authored list. Guests check items off in their own browser. Hidden when empty.</p>
              <ol className="space-y-3">
                {packingRows.map((row, index) => (
                  <li key={index} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
                    <Field
                      label={`Pack title ${index + 1}`}
                      name={`packTitle-${index}`}
                      value={row.title}
                      onChange={(value) => {
                        invalidateFieldEdit();
                        setPackingRows((rows) => rows.map((item, i) => (i === index ? { ...item, title: value } : item)));
                      }}
                    />
                    <Field
                      label={`Pack note ${index + 1}`}
                      name={`packNote-${index}`}
                      value={row.note}
                      onChange={(value) => {
                        invalidateFieldEdit();
                        setPackingRows((rows) => rows.map((item, i) => (i === index ? { ...item, note: value } : item)));
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        invalidateFieldEdit();
                        setPackingRows((rows) => rows.filter((_, i) => i !== index));
                      }}
                    >
                      Remove item
                    </Button>
                  </li>
                ))}
              </ol>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  invalidateFieldEdit();
                  setPackingRows((rows) => [...rows, { ...EMPTY_PACK_ROW }]);
                }}
              >
                Add pack item
              </Button>
            </fieldset>
          ) : null}

          <fieldset disabled={isPending || sample} className="space-y-4">
            <legend className="text-lg font-semibold">RSVP section</legend>
            <Field label="RSVP heading" name="rsvpHeading" value={rsvpHeading} onChange={setRsvpHeading} />
            <div>
              <Label htmlFor="rsvpDescription">RSVP instructions</Label>
              <Textarea
                id="rsvpDescription"
                name="rsvpDescription"
                value={rsvpDescription}
                rows={3}
                onChange={(event) => setRsvpDescription(event.target.value)}
              />
            </div>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="plusOnes"
                value="allowed"
                checked={plusOnes === "allowed"}
                onChange={(event) => {
                  invalidateFieldEdit();
                  setPlusOnes(event.target.checked ? "allowed" : "not-allowed");
                }}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>Allow plus-ones. When a guest says Yes, they can add an optional name — never a required headcount.</span>
            </label>
          </fieldset>

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {notice ? (
            <div role="status" className="space-y-1 text-sm text-emerald-700">
              <p>{notice}</p>
            </div>
          ) : null}
          {publishedUrl ? (
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">Guest link</p>
              <p className="mt-1 break-all font-mono text-xs">{publishedUrl}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => navigator.clipboard.writeText(absoluteGuestUrl(publishedUrl))}
              >
                Copy guest link
              </Button>
              <Button asChild variant="outline" className="mt-2 ml-2">
                <Link href={publishedUrl}>Open guest page</Link>
              </Button>
            </div>
          ) : null}
          {!isWrongHostKeyError(error) ? (
            <div className="space-y-2 rounded-lg border border-border p-4">
              <Label htmlFor="hostKeyFallback">Host key</Label>
              <Input
                id="hostKeyFallback"
                name="hostKeyFallback"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={hostKeyFallback}
                onChange={(event) => setHostKeyFallback(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If Save draft asks for a host key, paste it here. Copying the key never signs you out.
              </p>
            </div>
          ) : null}
          <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/90 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={sample || isPending}>{isPending ? "Saving…" : "Save draft"}</Button>
              <Button type="button" variant="outline" onClick={publishNow} disabled={sample || isPending}>{isPending ? "Working…" : published ? "Publish latest draft" : "Publish for guests"}</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function absoluteGuestUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
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

