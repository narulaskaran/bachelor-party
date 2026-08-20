import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PartyView } from "@/components/party-view";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("@/components/sections/rsvp", () => ({
  RsvpSection: ({ sample, preview }: { sample?: boolean; preview?: boolean }) =>
    createElement(
      "div",
      { "data-rsvp-sample": String(Boolean(sample)), "data-rsvp-preview": String(Boolean(preview)) },
    ),
}));

vi.mock("@/components/countdown", () => ({
  Countdown: () => null,
}));

describe("PartyView host preview", () => {
  it("forwards preview without treating a real draft as /demo", () => {
    const html = renderToStaticMarkup(
      createElement(PartyView, {
        content: {
          kind: "trip",
          trip: { siteName: "Friday drinks", startDate: "2026-09-04", startTime: "7:00 PM" },
        },
        preview: true,
        slug: "friday-drinks",
      }),
    );
    expect(html).toContain('data-rsvp-sample="false"');
    expect(html).toContain('data-rsvp-preview="true"');
    expect(html).not.toContain("Key events");
    expect(html).not.toContain("Add days and events");
    expect(html).not.toMatch(/API, CLI, or an agent/);
  });

  it("hides Key events in host preview when a night out has empty schedule days", () => {
    const html = renderToStaticMarkup(
      createElement(PartyView, {
        content: {
          kind: "trip",
          preset: "night-out",
          trip: { siteName: "Friday drinks" },
          schedule: [
            {
              key: "2026-09-04",
              date: "2026-09-04",
              weekday: "Friday",
              label: "Friday",
              timed: false,
              entries: [],
            },
          ],
        },
        preview: true,
        slug: "friday-drinks",
      }),
    );
    expect(html).not.toContain("Key events");
    expect(html).not.toContain("Schedule");
    expect(html).not.toContain("Add days and events");
    expect(html).not.toMatch(/API, CLI, or an agent/);
    expect(html).not.toContain('id="schedule"');
  });

  it("also hides Key events on a published guest view with empty schedule days", () => {
    const html = renderToStaticMarkup(
      createElement(PartyView, {
        content: {
          kind: "trip",
          preset: "night-out",
          trip: { siteName: "Friday drinks" },
          schedule: [
            {
              key: "2026-09-04",
              date: "2026-09-04",
              weekday: "Friday",
              label: "Friday",
              timed: false,
              entries: [],
            },
          ],
        },
        inviteToken: "a".repeat(32),
      }),
    );
    expect(html).not.toContain("Key events");
    expect(html).not.toContain("Schedule");
    expect(html).not.toContain("Add days and events");
    expect(html).not.toMatch(/API, CLI, or an agent/);
    expect(html).not.toContain('id="schedule"');
  });

  it("still marks the public demo fixture as sample", () => {
    const html = renderToStaticMarkup(
      createElement(PartyView, {
        content: {
          kind: "trip",
          trip: { siteName: "Alpine Weekend" },
        },
        sample: true,
        slug: "demo",
      }),
    );
    expect(html).toContain('data-rsvp-sample="true"');
    expect(html).toContain('data-rsvp-preview="false"');
  });
});
