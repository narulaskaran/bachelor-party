import { describe, expect, it } from "vitest";
import {
  draftForParty,
  initialDraftState,
  publishedForGuests,
  parseScheduleText,
  preserveScheduleKeyEvents,
  scheduleToText,
  rsvpForDraft,
  type DraftPartyState,
} from "@/lib/draft-publish";
import type { PartyContent } from "@/lib/party-types";

const content: PartyContent = {
  kind: "trip",
  trip: {
    siteName: "Cabin Weekend",
    startDate: "2026-09-04",
    endDate: "2026-09-07",
    dateLabel: "Sep 4, 2026 – Sep 7, 2026",
  },
};

describe("draft and publish state", () => {
  it("starts a new trip unpublished with an editable draft", () => {
    expect(initialDraftState(content)).toEqual({
      content,
      draftContent: content,
      published: false,
    });
  });

  it("reads the draft for host editing without changing the published snapshot", () => {
    const party: DraftPartyState = {
      content: { ...content, trip: { ...content.trip, siteName: "Published name" } },
      draftContent: { ...content, trip: { ...content.trip, siteName: "Draft name" } },
      published: true,
    };
    expect(draftForParty(party).trip.siteName).toBe("Draft name");
    expect(publishedForGuests(party)?.trip.siteName).toBe("Published name");
  });

  it("does not expose an unpublished draft to guests", () => {
    expect(publishedForGuests({ ...initialDraftState(content) })).toBeNull();
  });

  it("keeps a published snapshot stable while the draft changes", () => {
    const party: DraftPartyState = {
      content,
      draftContent: { ...content, trip: { ...content.trip, location: "New location" } },
      published: true,
    };
    expect(publishedForGuests(party)).toEqual(content);
    expect(draftForParty(party).trip.location).toBe("New location");
  });
});

describe("plain-language schedule editor", () => {
  it("turns one event per line into schedule days without JSON", () => {
    expect(
      parseScheduleText(
        "2026-09-04 | Friday | Arrival day | 5:00 PM | Airport pickup\n2026-09-04 | Friday | Arrival day | 7:00 PM | Group dinner",
      ),
    ).toEqual([
      {
        key: "2026-09-04",
        date: "2026-09-04",
        weekday: "Friday",
        label: "Arrival day",
        timed: true,
        entries: [
          { time: "5:00 PM", title: "Airport pickup" },
          { time: "7:00 PM", title: "Group dinner" },
        ],
      },
    ]);
  });

  it("returns an accessible field error for malformed lines", () => {
    expect(() => parseScheduleText("Saturday | Dinner")).toThrow(/schedule line/i);
  });

  it("preserves key-event flags through the editor text round trip", () => {
    const schedule = [
      {
        key: "2026-09-04",
        date: "2026-09-04",
        weekday: "Friday",
        label: "Arrival day",
        timed: true,
        entries: [
          { time: "5:00 PM", title: "Airport pickup" },
          { time: "7:00 PM", title: "Group dinner", marquee: true },
        ],
      },
    ];
    expect(parseScheduleText(scheduleToText(schedule))).toEqual(schedule);
  });

  it("preserves RSVP policy while applying edited copy", () => {
    expect(
      rsvpForDraft(
        { plusOnePolicy: "allowed", allowPlusOne: true, maxPartySize: 6 },
        "  RSVP now  ",
        "  Bring a friend  ",
      ),
    ).toEqual({
      plusOnePolicy: "allowed",
      allowPlusOne: true,
      maxPartySize: 6,
      heading: "RSVP now",
      description: "Bring a friend",
    });
  });

  it("preserves picker key events when an editor save has a stale schedule copy", () => {
    const previous = parseScheduleText(
      "2026-09-04 | Friday | Arrival day | 7:00 PM | [key] Group dinner",
    );
    const staleEditor = parseScheduleText(
      "2026-09-04 | Friday | Arrival day | 7:00 PM | Group dinner",
    );
    expect(preserveScheduleKeyEvents(previous, staleEditor)).toEqual(previous);
  });

  it("does not restore a key event when the editor intentionally changed the event", () => {
    const previous = parseScheduleText(
      "2026-09-04 | Friday | Arrival day | 7:00 PM | [key] Group dinner",
    );
    const edited = parseScheduleText(
      "2026-09-04 | Friday | Arrival day | 7:00 PM | New dinner plan",
    );
    expect(preserveScheduleKeyEvents(previous, edited)).toEqual(edited);
  });
});

describe("pack list editor", () => {
  it("parses host-authored items without inventing extras", async () => {
    const { parsePackingText, packingToText } = await import("@/lib/draft-publish");
    expect(parsePackingText("Government ID\nLayers | Nights drop below 40\n")).toEqual([
      { title: "Government ID" },
      { title: "Layers", note: "Nights drop below 40" },
    ]);
    expect(parsePackingText("   \n")).toBeUndefined();
    expect(packingToText([{ title: "ID", note: "Wallet" }])).toBe("ID | Wallet");
  });
});
