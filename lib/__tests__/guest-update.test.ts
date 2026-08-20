import { describe, expect, it } from "vitest";
import { criticalGuestChanges, guestUpdateForPublish, guestUpdateLabel } from "@/lib/guest-update";
import type { PartyContent } from "@/lib/party-types";

const published: PartyContent = {
  kind: "trip",
  trip: { siteName: "Dinner", startDate: "2026-09-04", location: "Denver", timezone: "America/Denver" },
};

describe("guest-visible updates after publish", () => {
  it("does not mark a first publish as updated", () => {
    expect(guestUpdateForPublish(published, published, false)).toBeUndefined();
  });

  it("marks a critical logistics change and keeps copy-only edits from resetting the notice", () => {
    const moved: PartyContent = {
      ...published,
      trip: { ...published.trip, startDate: "2026-09-05", location: "Boulder" },
    };
    const update = guestUpdateForPublish(published, moved, true, new Date("2026-08-20T12:00:00Z"));
    expect(update).toEqual({
      at: "2026-08-20T12:00:00.000Z",
      fields: ["When", "Where"],
    });
    expect(guestUpdateLabel(update!, new Date("2026-08-20T12:00:00Z"))).toBe("Updated just now");

    const copyOnly: PartyContent = {
      ...moved,
      packing: [{ title: "Hat" }],
      guestUpdate: update,
    };
    expect(guestUpdateForPublish({ ...moved, guestUpdate: update }, copyOnly, true)).toEqual(update);
    expect(criticalGuestChanges(published, { ...published, packing: [{ title: "Hat" }] })).toEqual([]);
    expect(criticalGuestChanges(published, { ...published, trip: { ...published.trip, tagline: "x" } })).toEqual(["What"]);
  });
});
