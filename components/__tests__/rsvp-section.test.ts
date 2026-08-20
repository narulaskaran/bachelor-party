import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RsvpSection } from "@/components/sections/rsvp";
import { getGuests } from "@/lib/rsvp-actions";

vi.mock("@/components/rsvp-form", () => ({
  RsvpForm: ({ sample, preview }: { sample?: boolean; preview?: boolean }) =>
    createElement("div", {
      "data-rsvp-form": "mock",
      "data-sample": String(Boolean(sample)),
      "data-preview": String(Boolean(preview)),
    }),
}));

vi.mock("@/lib/rsvp-actions", () => ({
  getGuests: vi.fn(async () => []),
  getRsvpPrefill: vi.fn(async () => null),
}));

describe("RsvpSection sample copy", () => {
  beforeEach(() => {
    vi.mocked(getGuests).mockClear();
  });

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

  it("uses live guest copy on a host preview that is not /demo", async () => {
    const html = renderToStaticMarkup(
      await RsvpSection({ preview: true, pollActivities: [] }),
    );
    expect(html).toMatch(/come back on this browser/i);
    expect(html).toContain("No one&#x27;s on the list yet. Add yours above.");
    expect(html).not.toMatch(/preview of the guest RSVP form/i);
    expect(html).not.toMatch(/sample list/i);
    expect(html).not.toMatch(/demo mode/i);
    expect(html).toContain('data-sample="false"');
    expect(html).toContain('data-preview="true"');
    expect(getGuests).not.toHaveBeenCalled();
  });

  it("shows guest roster names without private RSVP details", async () => {
    vi.mocked(getGuests).mockResolvedValueOnce([
      {
        id: 7,
        name: "Mina",
        arrivalFlight: "UA 1523",
        arrivalTime: "Fri 10:45 AM",
        departureFlight: "UA 887",
        departureTime: "Mon 3:15 PM",
        dietary: "Vegetarian, no nuts",
      } as never,
    ]);
    const html = renderToStaticMarkup(
      await RsvpSection({ sample: false, pollActivities: [], airport: "JAC" }),
    );
    expect(html).toContain("Mina");
    expect(html).not.toContain("UA 1523");
    expect(html).not.toContain("UA 887");
    expect(html).not.toContain("Vegetarian, no nuts");
  });

  it("keeps private roster details out of the public sample", async () => {
    vi.mocked(getGuests).mockResolvedValueOnce([
      {
        id: 7,
        name: "Mina",
        arrivalFlight: "UA 1523",
        dietary: "Vegetarian, no nuts",
      } as never,
    ]);
    const html = renderToStaticMarkup(
      await RsvpSection({ sample: true, pollActivities: [], airport: "JAC" }),
    );
    expect(html).not.toContain("Mina");
    expect(html).not.toContain("UA 1523");
    expect(html).not.toContain("Vegetarian, no nuts");
  });
});
