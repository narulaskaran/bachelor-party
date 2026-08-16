import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RsvpSection } from "@/components/sections/rsvp";

vi.mock("@/components/rsvp-form", () => ({
  RsvpForm: () => createElement("div", { "data-rsvp-form": "mock" }),
}));

vi.mock("@/lib/rsvp-actions", () => ({
  getGuests: vi.fn(async () => []),
  getRsvpPrefill: vi.fn(async () => null),
}));

describe("RsvpSection sample copy", () => {
  it("does not tell demo visitors to come back and update a saved RSVP", async () => {
    const html = renderToStaticMarkup(
      await RsvpSection({ sample: true, pollActivities: [] }),
    );
    expect(html).toMatch(/preview of the guest RSVP form/i);
    expect(html).not.toMatch(/come back on this browser/i);
    expect(html).not.toMatch(/already saved/i);
    expect(html).toMatch(/>RSVP</);
    expect(html).not.toMatch(/Your info/i);
    expect(html).not.toMatch(/Who.?s checked in/i);
    expect(html).toContain("No one&#x27;s on this sample list");
    expect(html).not.toMatch(/Add yours above/i);
  });

  it("keeps persistence copy on a real trip", async () => {
    const html = renderToStaticMarkup(
      await RsvpSection({ sample: false, pollActivities: [] }),
    );
    expect(html).toMatch(/come back on this browser/i);
    expect(html).not.toMatch(/preview of the guest RSVP form/i);
    expect(html).toMatch(/>RSVP</);
    expect(html).toContain("No one&#x27;s on the list yet. Add yours above.");
  });
});
