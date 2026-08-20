import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HostScheduleView } from "@/components/host-schedule-view";

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

const schedule = [
  {
    key: "2026-10-02",
    date: "2026-10-02",
    weekday: "Friday",
    label: "Friday",
    timed: true,
    entries: [{ time: "3:00 PM", title: "Check in" }],
  },
];

describe("HostScheduleView guest link", () => {
  it("opens the minted guest invite, not /{slug}", () => {
    const html = renderToStaticMarkup(
      createElement(HostScheduleView, {
        slug: "cabin-weekend",
        schedule,
        guestHref: `/g/${"f".repeat(32)}`,
      }) as ReactElement,
    );
    expect(html).toContain(`href="/g/${"f".repeat(32)}"`);
    expect(html).toContain("Guest view");
    expect(html).not.toContain('href="/cabin-weekend"');
  });

  it("tells the host to copy the guest link when the event is unpublished", () => {
    const html = renderToStaticMarkup(
      createElement(HostScheduleView, {
        slug: "cabin-weekend",
        schedule,
      }) as ReactElement,
    );
    expect(html).toMatch(/copy the guest link/i);
    expect(html).not.toContain("Guest view");
    expect(html).not.toContain('href="/cabin-weekend"');
  });
});
