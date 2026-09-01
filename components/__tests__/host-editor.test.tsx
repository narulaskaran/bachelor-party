/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostEditor } from "@/components/host-editor";
import { hostKeyStorageKey, rememberHostKey } from "@/lib/host-key-storage";
import { ingestEventPlan, ingestEventPlanFromHeuristics } from "@/lib/plan-ingestion";
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
  packing: [{ title: "Layers", note: "Cold" }],
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
  ["Start time", "8:00 PM"],
  ["Location", "Boulder"],
  ["Time zone", "America/Chicago"],
  ["Lodging name", "New cabin"],
  ["Lodge address", "2 Main St"],
  ["Listing URL (HTTPS)", "https://example.com/new-cabin"],
  ["Lodge maps URL (HTTPS)", "https://maps.example.com/new-cabin"],
  ["Page style", "editorial"],
  ["Schedule title 1", "Late dinner"],
  ["RSVP heading", "Reply now"],
  ["RSVP instructions", "Reply by Friday."],
  ["Pack title 1", "Government ID"],
] as const;

describe("HostEditor draft review safety", () => {
  afterEach(() => cleanup());
  beforeEach(() => sessionStorage.clear());

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

  it("previews the guest When line as dates, time, and timezone change", () => {
    render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published
        save={vi.fn(async () => ({ ok: true as const }))}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    const preview = () => screen.getByText(/guests will see:/i);
    expect(preview().textContent).toMatch(/Fri, Sep 4 – Mon, Sep 7/);

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "19:00" } });
    expect(preview().textContent).toMatch(/Fri, Sep 4 – Mon, Sep 7, 7:00 PM M[DS]T/);

    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-09-04" } });
    expect(preview().textContent).toMatch(/Fri, Sep 4, 7:00 PM M[DS]T/);
    expect(preview().textContent).not.toMatch(/Sep 4 –/);

    fireEvent.change(screen.getByLabelText("Time zone"), { target: { value: "" } });
    expect(preview().textContent).toBe("Guests will see: Fri, Sep 4 · time TBD");
    expect(preview().textContent).not.toMatch(/7:00 PM/);
  });

  it("marks an extracted timezone-free clock as needing timezone confirmation", () => {
    const { content } = ingestEventPlanFromHeuristics("Event: Dinner\n2026-09-04 7:00 PM — dinner");
    render(
      <HostEditor
        slug="dinner"
        initial={content}
        published={false}
        save={vi.fn(async () => ({ ok: true as const }))}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    const whenFact = screen.getByText("When").closest("li");
    expect(whenFact?.textContent).toMatch(/extracted/i);
    expect(whenFact?.textContent).toMatch(/timezone needed/i);
    expect(whenFact?.textContent).not.toMatch(/confirmed/i);
    expect(screen.getByText("Guests will see: Fri, Sep 4 · time TBD")).toBeTruthy();
  });

  it("treats a nameless dump's Untitled event placeholder as a missing Event name", async () => {
    const { content } = await ingestEventPlan(
      "meet at LGA terminal B Friday",
      { preset: "night-out" },
      { extract: async () => ({ location: "LGA terminal B" }) },
    );
    render(
      <HostEditor
        slug="lga-meetup"
        initial={content}
        published={false}
        save={vi.fn(async () => ({ ok: true as const }))}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    const nameFact = screen.getByText("Event name").closest("li");
    expect(nameFact?.textContent).toMatch(/missing/i);
    expect(nameFact?.textContent).toMatch(/TBD — needs confirmation/i);
    expect(nameFact?.textContent).not.toMatch(/confirmed/i);
    expect(nameFact?.textContent).not.toMatch(/extracted/i);
    expect(nameFact?.textContent).not.toMatch(/Untitled event/i);
    const whereFact = screen.getByText("Where").closest("li");
    expect(whereFact?.textContent).toMatch(/extracted/i);
    expect(whereFact?.textContent).toMatch(/LGA terminal B/);
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
    fireEvent.change(screen.getByLabelText("Schedule title 1"), { target: { value: "Late dinner" } });
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

  it("shows a working host-key field when Save draft is rejected for a missing cookie", async () => {
    const save = vi.fn<
      (
        slug: string,
        content: PartyContent,
        preserveScheduleKeyEvents?: boolean,
        hostKey?: string,
      ) => Promise<{ ok: false; error: string }>
    >(async () => ({
      ok: false as const,
      error: "Wrong host key. It's the key shown when you created this event — not a guest link.",
    }));
    render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published={false}
        save={save}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    expect(screen.getByLabelText(/^host key$/i)).toBeTruthy();
    fireEvent.submit(screen.getByRole("button", { name: /save draft/i }).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0]?.[3]).toBeUndefined();
    expect(screen.getByLabelText(/^host key$/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^enter$/i })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/wrong host key/i);
  });

  it("keeps the stored host key for Save draft after the banner would have been copied", async () => {
    rememberHostKey("cabin-weekend", "party-tok");
    const save = vi.fn<
      (
        slug: string,
        content: PartyContent,
        preserveScheduleKeyEvents?: boolean,
        hostKey?: string,
      ) => Promise<{ ok: true }>
    >(async () => ({ ok: true }));
    render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published={false}
        save={save}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    fireEvent.submit(screen.getByRole("button", { name: /save draft/i }).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]?.[3]).toBe("party-tok");
    expect(sessionStorage.getItem(hostKeyStorageKey("cabin-weekend"))).toBe("party-tok");
  });

  it("sends a typed host key with Save draft when the tab session is empty", async () => {
    const save = vi.fn<
      (
        slug: string,
        content: PartyContent,
        preserveScheduleKeyEvents?: boolean,
        hostKey?: string,
      ) => Promise<{ ok: true }>
    >(async () => ({ ok: true }));
    render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published={false}
        save={save}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    expect(screen.getByLabelText(/^host key$/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^host key$/i), { target: { value: "party-tok" } });
    fireEvent.submit(screen.getByRole("button", { name: /save draft/i }).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]?.[3]).toBe("party-tok");
    expect(sessionStorage.getItem(hostKeyStorageKey("cabin-weekend"))).toBe("party-tok");
  });

  it("collapses facts after review and save, then reopens on edit", async () => {
    const save = vi.fn(async () => ({ ok: true as const }));
    render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published={false}
        save={save}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    const facts = screen.getByText("Review the facts before sharing").closest("details");
    expect(facts?.open).toBe(false);

    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Updated title" } });
    expect(facts?.open).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /i reviewed every fact/i }));
    fireEvent.submit(screen.getByRole("button", { name: /save draft/i }).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(facts?.open).toBe(false);

    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Boulder" } });
    expect(facts?.open).toBe(true);
  });

  it("offers one Add section control for lodge, schedule, activities, and pack", () => {
    render(
      <HostEditor
        slug="dinner"
        initial={{ kind: "trip", preset: "night-out", trip: { siteName: "Friday drinks" } }}
        published={false}
        save={vi.fn(async () => ({ ok: true as const }))}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    const add = screen.getByLabelText("Add section");
    expect(add).toBeTruthy();
    expect(screen.queryByRole("button", { name: /add lodge/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /add schedule/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /add packing/i })).toBeNull();
    expect([...add.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "Choose…",
      "Lodge",
      "Schedule",
      "Activities",
      "Pack",
    ]);

    fireEvent.change(add, { target: { value: "lodging" } });
    expect(screen.getByLabelText("Lodging name")).toBeTruthy();
    expect([...screen.getByLabelText("Add section").querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "Choose…",
      "Schedule",
      "Activities",
      "Pack",
    ]);
  });

  it("shows Draft only, Live, or Unpublished changes — never Published + draft", () => {
    const save = vi.fn(async () => ({ ok: true as const }));
    const publish = vi.fn(async () => ({ ok: true as const }));

    const { unmount } = render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published={false}
        publishStatus="draft-only"
        save={save}
        publish={publish}
      />,
    );
    expect(screen.queryByText("Published + draft")).toBeNull();
    unmount();

    render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published
        publishStatus="live"
        save={save}
        publish={publish}
      />,
    );
    expect(screen.queryByText("Published + draft")).toBeNull();
  });

  it("does not preview an inverted end-before-start When line", () => {
    render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published
        save={vi.fn(async () => ({ ok: true as const }))}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-09-01" } });
    const preview = screen.getByText(/guests will see:/i);
    expect(preview.textContent).toBe("Guests will see: When TBD");
    expect(preview.textContent).not.toMatch(/Sep 1/);
    expect(preview.textContent).not.toMatch(/Sep 4 –/);
  });

  it("keeps Save draft and Publish sticky", () => {
    const { container } = render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published={false}
        save={vi.fn(async () => ({ ok: true as const }))}
        publish={vi.fn(async () => ({ ok: true as const }))}
      />,
    );
    const bar = container.querySelector(".sticky.bottom-0");
    expect(bar?.textContent).toMatch(/Save draft/);
    expect(bar?.textContent).toMatch(/Publish for guests/);
    expect(bar?.className).toContain("backdrop-blur");
    expect(bar?.closest("[data-slot=card]")?.className).toContain("overflow-visible");
  });

  it("keeps the Event title controlled when it is cleared", () => {
    const onLiveContentChange = vi.fn();
    render(
      <HostEditor
        slug="cabin-weekend"
        initial={initial}
        published={false}
        save={vi.fn(async () => ({ ok: true as const }))}
        publish={vi.fn(async () => ({ ok: true as const }))}
        onLiveContentChange={onLiveContentChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "" } });
    expect((screen.getByLabelText("Event title") as HTMLInputElement).value).toBe("");
    expect(onLiveContentChange).toHaveBeenCalled();
    const last = onLiveContentChange.mock.calls.at(-1)?.[0] as PartyContent;
    expect(last.trip.siteName).toBe("Untitled event");
  });
});
