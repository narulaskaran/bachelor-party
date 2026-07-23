"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PartyContent, ActionItem, Trip, Lodging } from "@/lib/party-types";
import { createPartyAction, updatePartyAction, type PartyFormState } from "./actions";

const emptyTrip: Trip = {
  groomName: "",
  siteName: "",
  tagline: "",
  startDate: "",
  endDate: "",
  dateLabel: "",
  location: "",
  coordinates: "",
  elevation: "",
  airport: "",
};

const emptyLodging: Lodging = {
  name: "",
  url: "",
  address: "",
  mapsUrl: "",
  bedrooms: 0,
  beds: 0,
  bathrooms: 0,
  totalCost: "",
  amenities: [],
  driveFromAirport: "",
};

function generatePassword(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

type Props =
  | { mode: "create" }
  | { mode: "edit"; slug: string; initialContent: PartyContent };

export function PartyForm(props: Props) {
  const initialContent = props.mode === "edit" ? props.initialContent : null;

  const [slug, setSlug] = useState(props.mode === "edit" ? props.slug : "");
  const [password, setPassword] = useState("");
  const [trip, setTrip] = useState<Trip>(initialContent?.trip ?? emptyTrip);
  const [lodging, setLodging] = useState<Lodging>(initialContent?.lodging ?? emptyLodging);
  const [amenitiesText, setAmenitiesText] = useState(
    (initialContent?.lodging.amenities ?? []).join(", ")
  );
  const [scheduleText, setScheduleText] = useState(
    JSON.stringify(initialContent?.schedule ?? [], null, 2)
  );
  const [activitiesText, setActivitiesText] = useState(
    JSON.stringify(
      initialContent?.activities ?? { core: [], ifTimeAllows: [], backups: [] },
      null,
      2
    )
  );
  const [actionItems, setActionItems] = useState<ActionItem[]>(initialContent?.actionItems ?? []);

  const action =
    props.mode === "create" ? createPartyAction : updatePartyAction.bind(null, props.slug);
  const [state, formAction, isPending] = useActionState<PartyFormState, FormData>(action, {});

  const contentJson = useMemo(() => {
    let schedule: unknown = [];
    let activities: unknown = { core: [], ifTimeAllows: [], backups: [] };
    try {
      schedule = JSON.parse(scheduleText || "[]");
    } catch {
      // surfaced by the server action's own JSON.parse + zod validation
    }
    try {
      activities = JSON.parse(activitiesText || "{}");
    } catch {
      // surfaced by the server action's own JSON.parse + zod validation
    }
    const content: PartyContent = {
      trip,
      lodging: {
        ...lodging,
        amenities: amenitiesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
      schedule: schedule as PartyContent["schedule"],
      activities: activities as PartyContent["activities"],
      actionItems,
    };
    return JSON.stringify(content);
  }, [trip, lodging, amenitiesText, scheduleText, activitiesText, actionItems]);

  function addActionItem() {
    setActionItems((items) => [...items, { title: "", note: "", anchor: "" }]);
  }
  function removeActionItem(index: number) {
    setActionItems((items) => items.filter((_, i) => i !== index));
  }
  function updateActionItem(index: number, field: keyof ActionItem, value: string) {
    setActionItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="content" value={contentJson} />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Party
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slug">
            <Input
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={props.mode === "edit"}
              placeholder="denver2k26"
              required
            />
          </Field>
          <Field label={props.mode === "edit" ? "Password (leave blank to keep current)" : "Password"}>
            <div className="flex gap-2">
              <Input
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={props.mode === "create"}
              />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                Generate
              </Button>
            </div>
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Trip basics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Groom name">
            <Input value={trip.groomName} onChange={(e) => setTrip({ ...trip, groomName: e.target.value })} required />
          </Field>
          <Field label="Site name">
            <Input value={trip.siteName} onChange={(e) => setTrip({ ...trip, siteName: e.target.value })} required />
          </Field>
          <Field label="Tagline">
            <Input value={trip.tagline} onChange={(e) => setTrip({ ...trip, tagline: e.target.value })} required />
          </Field>
          <Field label="Date label">
            <Input
              value={trip.dateLabel}
              onChange={(e) => setTrip({ ...trip, dateLabel: e.target.value })}
              placeholder="Sep 4–7, 2026"
              required
            />
          </Field>
          <Field label="Start date">
            <Input
              type="date"
              value={trip.startDate}
              onChange={(e) => setTrip({ ...trip, startDate: e.target.value })}
              required
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={trip.endDate}
              onChange={(e) => setTrip({ ...trip, endDate: e.target.value })}
              required
            />
          </Field>
          <Field label="Location">
            <Input value={trip.location} onChange={(e) => setTrip({ ...trip, location: e.target.value })} required />
          </Field>
          <Field label="Coordinates">
            <Input
              value={trip.coordinates}
              onChange={(e) => setTrip({ ...trip, coordinates: e.target.value })}
              required
            />
          </Field>
          <Field label="Elevation">
            <Input value={trip.elevation} onChange={(e) => setTrip({ ...trip, elevation: e.target.value })} required />
          </Field>
          <Field label="Airport">
            <Input value={trip.airport} onChange={(e) => setTrip({ ...trip, airport: e.target.value })} required />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Lodging
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={lodging.name} onChange={(e) => setLodging({ ...lodging, name: e.target.value })} required />
          </Field>
          <Field label="URL">
            <Input value={lodging.url} onChange={(e) => setLodging({ ...lodging, url: e.target.value })} required />
          </Field>
          <Field label="Address">
            <Input
              value={lodging.address}
              onChange={(e) => setLodging({ ...lodging, address: e.target.value })}
              required
            />
          </Field>
          <Field label="Maps URL">
            <Input
              value={lodging.mapsUrl}
              onChange={(e) => setLodging({ ...lodging, mapsUrl: e.target.value })}
              required
            />
          </Field>
          <Field label="Bedrooms">
            <Input
              type="number"
              value={lodging.bedrooms}
              onChange={(e) => setLodging({ ...lodging, bedrooms: Number(e.target.value) })}
              required
            />
          </Field>
          <Field label="Beds">
            <Input
              type="number"
              value={lodging.beds}
              onChange={(e) => setLodging({ ...lodging, beds: Number(e.target.value) })}
              required
            />
          </Field>
          <Field label="Bathrooms">
            <Input
              type="number"
              value={lodging.bathrooms}
              onChange={(e) => setLodging({ ...lodging, bathrooms: Number(e.target.value) })}
              required
            />
          </Field>
          <Field label="Total cost">
            <Input
              value={lodging.totalCost}
              onChange={(e) => setLodging({ ...lodging, totalCost: e.target.value })}
              required
            />
          </Field>
          <Field label="Drive from airport">
            <Input
              value={lodging.driveFromAirport}
              onChange={(e) => setLodging({ ...lodging, driveFromAirport: e.target.value })}
              required
            />
          </Field>
          <Field label="Amenities (comma-separated)">
            <Input value={amenitiesText} onChange={(e) => setAmenitiesText(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Action items
        </h2>
        <div className="flex flex-col gap-3">
          {actionItems.map((item, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Input
                placeholder="Title"
                value={item.title}
                onChange={(e) => updateActionItem(i, "title", e.target.value)}
              />
              <Input
                placeholder="Note"
                value={item.note ?? ""}
                onChange={(e) => updateActionItem(i, "note", e.target.value)}
              />
              <Input
                placeholder="Anchor (#rsvp)"
                value={item.anchor ?? ""}
                onChange={(e) => updateActionItem(i, "anchor", e.target.value)}
              />
              <Button type="button" variant="ghost" onClick={() => removeActionItem(i)}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addActionItem} className="w-fit">
            + Add action item
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Schedule &amp; activities (raw JSON — Phase 4 will replace this)
        </h2>
        <Field label="Schedule (ScheduleDay[])">
          <Textarea
            value={scheduleText}
            onChange={(e) => setScheduleText(e.target.value)}
            rows={10}
            className="font-mono text-xs"
          />
        </Field>
        <Field label="Activities ({ core, ifTimeAllows, backups })">
          <Textarea
            value={activitiesText}
            onChange={(e) => setActivitiesText(e.target.value)}
            rows={10}
            className="font-mono text-xs"
          />
        </Field>
      </section>

      {state.error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <p>{state.error}</p>
          {state.issues?.length ? (
            <ul className="mt-2 list-disc pl-5">
              {state.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : props.mode === "create" ? "Create party" : "Save changes"}
        </Button>
        <Link href="/admin" className="text-sm text-muted-foreground underline underline-offset-4">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
