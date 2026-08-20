/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HostEditor } from "@/components/host-editor";
import type { PartyContent } from "@/lib/party-types";

const initial: PartyContent = {
  kind: "trip",
  trip: {
    siteName: "Cabin Weekend",
    tagline: "A good time",
    startDate: "2026-09-04",
    endDate: "2026-09-07",
    location: "Denver",
    airport: "DEN",
    timezone: "America/Denver",
  },
  lodging: {
    name: "The Cabin",
    address: "1 Main St",
    url: "https://example.com/cabin",
    mapsUrl: "https://maps.example.com/cabin",
  },
  presentation: { style: "clean" },
  schedule: [{
    key: "friday",
    date: "2026-09-04",
    weekday: "Friday",
    label: "Arrival",
    timed: true,
    entries: [{ time: "7:00 PM", title: "Dinner" }],
  }],
  rsvp: { heading: "RSVP", description: "Tell us if you can come." },
  draftReview: {
    acknowledged: true,
    facts: [
      { path: "trip.siteName", label: "Event name", status: "confirmed", value: "Cabin Weekend" },
      { path: "trip.startDate", label: "Start date", status: "confirmed", value: "2026-09-04" },
      { path: "trip.endDate", label: "End date", status: "confirmed", value: "2026-09-07" },
      { path: "trip.location", label: "Location", status: "confirmed", value: "Denver" },
      { path: "trip.timezone", label: "Timezone", status: "confirmed", value: "America/Denver" },
      { path: "lodging.name", label: "Lodging", status: "confirmed", value: "The Cabin" },
      { path: "schedule", label: "Schedule", status: "confirmed", value: "1 item(s)" },
    ],
  },
};

const editableFields = [
  ["Event title", "Updated title"],
  ["Tagline", "Updated tagline"],
  ["Start date", "2026-09-05"],
  ["End date", "2026-09-08"],
  ["Location", "Boulder"],
  ["Airport", "BJC"],
  ["Time zone", "America/Chicago"],
  ["Lodging name", "New cabin"],
  ["Address", "2 Main St"],
  ["Listing URL (HTTPS)", "https://example.com/new-cabin"],
  ["Maps URL (HTTPS)", "https://maps.example.com/new-cabin"],
  ["Page style", "editorial"],
  ["Schedule events", "2026-09-04 | Friday | Arrival | 8:00 PM | Dinner"],
  ["RSVP heading", "Reply now"],
  ["RSVP instructions", "Reply by Friday."],
  ["Pack items", "Government ID | Wallet"],
] as const;

describe("HostEditor draft review safety", () => {
  afterEach(() => cleanup());

  it.each(editableFields)("invalidates acknowledgement and saved state when %s changes", (label, value) => {
    const publish = vi.fn(async () => ({ ok: true as const }));
    render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published
        save={vi.fn(async () => ({ ok: true as const }))}
        publish={publish}
      />,
    );

    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: /publish latest draft/i }));

    expect(publish).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/review every fact/i);
  });

  it("recomputes saved review facts from the edited canonical fields", async () => {
    const save = vi.fn<
      (slug: string, content: PartyContent, preserveScheduleKeyEvents?: boolean) => Promise<{ ok: true }>
    >(async () => ({ ok: true }));
    render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published
        save={save}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Updated title" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-09-05" } });
    fireEvent.change(screen.getByLabelText("Lodging name"), { target: { value: "New cabin" } });
    fireEvent.change(screen.getByLabelText("Schedule events"), {
      target: { value: "2026-09-04 | Friday | Arrival | 8:00 PM | Dinner" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /save draft/i }).closest("form")!);

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const call = save.mock.calls[0];
    if (!call) throw new Error("save was not called");
    const saved = call[1];
    expect(saved.draftReview?.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "trip.siteName", status: "confirmed", value: "Updated title" }),
      expect.objectContaining({ path: "trip.startDate", status: "confirmed", value: "2026-09-05" }),
      expect.objectContaining({ path: "lodging.name", status: "confirmed", value: "New cabin" }),
      expect.objectContaining({ path: "schedule", status: "confirmed", value: "1 item(s)" }),
    ]));
  });
});
