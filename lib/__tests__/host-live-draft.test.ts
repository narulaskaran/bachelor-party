import { describe, expect, it } from "vitest";
import { parseEventPreset, showWeekendEditorBlock } from "@/lib/event-preset";
import {
  buildHostDraft,
  hostPreviewCaption,
  livePreviewContent,
  type HostLiveDraftInput,
} from "@/lib/host-live-draft";
import { rowsFromActivities, rowsFromPacking, rowsFromSchedule } from "@/lib/schedule-rows";
import type { PartyContent } from "@/lib/party-types";

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
});
