/** @vitest-environment jsdom */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleSection } from "@/components/sections/schedule";
import { HostScheduleView } from "@/components/host-schedule-view";
import type { ScheduleDay } from "@/lib/party-types";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
}));

const friday: ScheduleDay = {
  key: "friday",
  date: "2030-08-30",
  weekday: "Friday",
  label: "Arrival day",
  timed: true,
  entries: [
    { time: "11:00 AM", title: "Arrivals window" },
    { time: "3:00 PM", title: "Check in at the lodge", marquee: true },
    { time: "7:00 PM", title: "Group dinner", marquee: true },
  ],
};

const emptyDay: ScheduleDay = {
  key: "2026-09-04",
  date: "2026-09-04",
  weekday: "Friday",
  label: "Friday",
  timed: true,
  entries: [],
};

describe("ScheduleSection", () => {
  it("labels key events and paints time, title, and dot with the primary color", () => {
    const html = renderToStaticMarkup(createElement(ScheduleSection, { schedule: [friday] }));
    expect(html).toContain("Key");
    expect(html).toContain("Check in at the lodge");
    expect(html).toContain("text-primary");
    expect(html).toContain("bg-primary");
    expect(html).toContain("11:00 AM");
    expect(html).toContain("font-mono text-sm");
    expect(html).not.toMatch(/font-mono text-xs/);
    expect(html).toMatch(/text-sm text-muted-foreground[^>]*>Aug 30/);
    expect(html).toContain("text-sm text-muted-foreground");
    expect(html).not.toContain("text-muted-foreground/80");
  });

  it("keeps a human day label and omits Plan or a weekday duplicate", () => {
    const withArrival = renderToStaticMarkup(createElement(ScheduleSection, { schedule: [friday] }));
    expect(withArrival).toContain("Arrival day");

    const ingested = renderToStaticMarkup(
      createElement(ScheduleSection, {
        schedule: [
          {
            key: "2026-09-04",
            date: "2026-09-04",
            weekday: "Friday",
            label: "Plan",
            timed: true,
            entries: [{ time: "7:00 PM", title: "group dinner" }],
          },
        ],
      }),
    );
    expect(ingested).toContain("Friday");
    expect(ingested).toContain("Sep 4");
    expect(ingested).not.toContain("Plan");
    expect((ingested.match(/Friday/g) ?? []).length).toBe(1);

    const weekdayAsLabel = renderToStaticMarkup(
      createElement(ScheduleSection, {
        schedule: [
          {
            key: "2026-09-04",
            date: "2026-09-04",
            weekday: "Friday",
            label: "Friday",
            timed: true,
            entries: [{ time: "7:00 PM", title: "group dinner" }],
          },
        ],
      }),
    );
    expect((weekdayAsLabel.match(/Friday/g) ?? []).length).toBe(1);
  });
});

describe("HostScheduleView", () => {
  beforeEach(() => {
    cleanup();
  });

  it("lets a host mark and unmark key events", async () => {
    const user = userEvent.setup();
    render(
      <HostScheduleView
        slug="demo"
        sample
        schedule={[
          {
            ...friday,
            entries: [
              { time: "11:00 AM", title: "Arrivals window" },
              { time: "3:00 PM", title: "Check in at the lodge" },
              { time: "7:00 PM", title: "Group dinner", marquee: true },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText(/1 key event$/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /mark arrivals window as a key event/i }));
    await user.click(
      screen.getByRole("button", { name: /mark check in at the lodge as a key event/i }),
    );
    expect(screen.getByText(/3 key events/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /unmark group dinner as a key event/i }));
    expect(screen.getByText(/2 key events/i)).toBeTruthy();
  });

  it("hides the key events picker when there is no schedule", () => {
    const { container } = render(<HostScheduleView slug="cabin" schedule={[]} />);
    expect(container.textContent).toBe("");
    expect(container.textContent).not.toMatch(/API, CLI, or an agent/i);
    expect(container.textContent).not.toMatch(/no schedule yet/i);
    expect(container.textContent).not.toMatch(/key events/i);
    expect(container.textContent).not.toMatch(/Add days and events/i);
  });

  it("hides the key events picker when days have no titled events", () => {
    const { container } = render(<HostScheduleView slug="cabin" schedule={[emptyDay]} />);
    expect(container.textContent).toBe("");
    expect(container.textContent).not.toMatch(/Key events/i);
    expect(container.textContent).not.toMatch(/API, CLI, or an agent/i);
    expect(container.textContent).not.toMatch(/Add days and events/i);
  });
});

describe("ScheduleSection empty", () => {
  it("renders nothing when there are no days", () => {
    const html = renderToStaticMarkup(createElement(ScheduleSection, { schedule: [] }));
    expect(html).toBe("");
    expect(html).not.toMatch(/Key events/i);
    expect(html).not.toMatch(/API, CLI, or an agent/i);
  });

  it("renders nothing when days have no titled events, even with a picker", () => {
    const html = renderToStaticMarkup(
      createElement(ScheduleSection, {
        schedule: [emptyDay],
        picker: { onToggle: () => undefined },
      }),
    );
    expect(html).toBe("");
    expect(html).not.toMatch(/Key events/i);
    expect(html).not.toMatch(/API, CLI, or an agent/i);
    expect(html).not.toMatch(/Add days and events/i);
  });
});
