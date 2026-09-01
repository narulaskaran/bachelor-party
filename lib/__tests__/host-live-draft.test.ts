import { describe, expect, it } from "vitest";
import { parseEventPreset, showWeekendEditorBlock } from "@/lib/event-preset";
import {
  buildHostDraft,
  hostPreviewCaption,
  livePreviewContent,
  type HostLiveDraftInput,
} from "@/lib/host-live-draft";
import { eventTitleOrFallback, UNTITLED_EVENT_TITLE, type PartyContent } from "@/lib/party-types";
import { rowsFromActivities, rowsFromPacking, rowsFromSchedule } from "@/lib/schedule-rows";

const content: PartyContent = {
  kind: "trip",
  preset: "weekend",
  trip: {
    siteName: "Cabin Weekend",
    startDate: "2026-09-04",
    endDate: "2026-09-07",
    location: "Denver",
    timezone: "America/Denver",
  },
  lodging: { name: "The Cabin" },
  schedule: [
    {
      key: "2026-09-04",
      date: "2026-09-04",
      weekday: "Friday",
      label: "Friday",
      timed: true,
      entries: [{ time: "7:00 PM", title: "Dinner" }],
    },
  ],
  packing: [{ title: "Layers" }],
  rsvp: { heading: "RSVP", plusOnePolicy: "allowed" },
  presentation: { style: "clean" },
};

function input(overrides: Partial<HostLiveDraftInput> = {}, party: PartyContent = content): HostLiveDraftInput {
  return {
    content: party,
    preset: parseEventPreset(party.preset),
    enabledBlocks: {
      schedule: showWeekendEditorBlock(party, "schedule"),
      lodging: showWeekendEditorBlock(party, "lodging"),
      activities: showWeekendEditorBlock(party, "activities"),
      packing: showWeekendEditorBlock(party, "packing"),
    },
    scheduleRows: rowsFromSchedule(party.schedule),
    packingRows: rowsFromPacking(party.packing),
    activityRows: rowsFromActivities(party.activities),
    reviewAcknowledged: true,
    mapsUrl: party.trip.mapsUrl ?? "",
    lodgingName: party.lodging?.name ?? "",
    lodgingAddress: party.lodging?.address ?? "",
    lodgingUrl: party.lodging?.url ?? "",
    lodgingMapsUrl: party.lodging?.mapsUrl ?? "",
    rsvpHeading: party.rsvp?.heading ?? "",
    rsvpDescription: party.rsvp?.description ?? "",
    plusOnes: party.rsvp?.plusOnePolicy === "not-allowed" ? "not-allowed" : "allowed",
    presentationStyle: party.presentation?.style === "editorial" ? "editorial" : "clean",
    ...overrides,
  };
}

describe("host live draft preview", () => {
  it("applies unsaved title and location to the draft snapshot", () => {
    const next = livePreviewContent(
      input({
        content: {
          ...content,
          trip: { ...content.trip, siteName: "Updated title", location: "Boulder" },
        },
      }),
      content,
    );
    expect(next.trip.siteName).toBe("Updated title");
    expect(next.trip.location).toBe("Boulder");
  });

  it("keeps the last valid dates when the range is inverted", () => {
    const next = livePreviewContent(
      input({
        content: {
          ...content,
          trip: { ...content.trip, startDate: "2026-09-04", endDate: "2026-09-01" },
        },
      }),
      content,
    );
    expect(next.trip.startDate).toBe("2026-09-04");
    expect(next.trip.endDate).toBe("2026-09-07");
    expect(buildHostDraft(input({
      content: {
        ...content,
        trip: { ...content.trip, endDate: "2026-09-01" },
      },
    })).ok).toBe(false);
  });

  it("keeps the last valid maps URL when the typed value is not HTTPS", () => {
    const published = {
      ...content,
      trip: { ...content.trip, mapsUrl: "https://maps.example.com/cabin" },
    };
    const next = livePreviewContent(
      input({ mapsUrl: "http://insecure.example" }, published),
      published,
    );
    expect(next.trip.mapsUrl).toBe("https://maps.example.com/cabin");
  });

  it("labels draft vs published preview captions", () => {
    expect(hostPreviewCaption("draft", true)).toBe("Previewing unsaved");
    expect(hostPreviewCaption("draft", false)).toBeNull();
    expect(hostPreviewCaption("guests", false)).toBe("Guests currently see");
    expect(hostPreviewCaption("guests", true)).toBe("Guests currently see");
  });

  it("keeps an empty or missing live title as a placeholder instead of throwing", () => {
    expect(eventTitleOrFallback("")).toBe(UNTITLED_EVENT_TITLE);
    expect(eventTitleOrFallback("   ")).toBe(UNTITLED_EVENT_TITLE);
    expect(eventTitleOrFallback(undefined)).toBe(UNTITLED_EVENT_TITLE);
    expect(eventTitleOrFallback(UNTITLED_EVENT_TITLE)).toBe(UNTITLED_EVENT_TITLE);
    expect(eventTitleOrFallback("Friday drinks")).toBe("Friday drinks");

    const empty = livePreviewContent(
      input({
        content: {
          ...content,
          trip: { ...content.trip, siteName: "" },
        },
      }),
      content,
    );
    expect(empty.trip.siteName).toBe(UNTITLED_EVENT_TITLE);
    expect(
      buildHostDraft(
        input({
          content: {
            ...content,
            trip: { ...content.trip, siteName: "" },
          },
        }),
      ),
    ).toMatchObject({ ok: true, content: { trip: { siteName: UNTITLED_EVENT_TITLE } } });

    const missing = livePreviewContent(
      input({
        content: {
          ...content,
          trip: { ...content.trip, siteName: undefined as unknown as string },
        },
      }),
      content,
    );
    expect(missing.trip.siteName).toBe(UNTITLED_EVENT_TITLE);
  });

  it("does not confirm the Untitled event crash-guard as a stated Event name", () => {
    const nameless: PartyContent = {
      ...content,
      trip: { ...content.trip, siteName: "" },
      draftReview: {
        acknowledged: false,
        facts: [{ path: "trip.siteName", label: "Event name", status: "missing" }],
      },
    };
    const built = buildHostDraft(input({}, nameless));
    expect(built).toMatchObject({ ok: true, content: { trip: { siteName: UNTITLED_EVENT_TITLE } } });
    if (!built.ok) throw new Error("expected a valid draft");
    expect(built.content.draftReview?.facts.find((item) => item.path === "trip.siteName")).toMatchObject({
      status: "missing",
    });
    expect(built.content.draftReview?.facts.find((item) => item.path === "trip.siteName")?.value).toBeUndefined();

    const storedPlaceholder = buildHostDraft(
      input(
        {},
        {
          ...nameless,
          trip: { ...nameless.trip, siteName: UNTITLED_EVENT_TITLE },
        },
      ),
    );
    expect(storedPlaceholder).toMatchObject({ ok: true, content: { trip: { siteName: UNTITLED_EVENT_TITLE } } });
    if (!storedPlaceholder.ok) throw new Error("expected a valid draft");
    expect(storedPlaceholder.content.draftReview?.facts.find((item) => item.path === "trip.siteName")).toMatchObject({
      status: "missing",
    });
    expect(storedPlaceholder.content.draftReview?.facts.find((item) => item.path === "trip.siteName")?.value).toBeUndefined();
  });
});
